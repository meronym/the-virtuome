#! /usr/bin/env python3

import asyncio
import datetime
from decimal import Decimal
import json
import os
from pathlib import Path
import re
from slugify import slugify
import hashlib

from dotenv import load_dotenv
load_dotenv()

from anthropic import AsyncAnthropic
import frontmatter
import jinja2

from llama_index.core import Settings
from llama_index.core.workflow import (
    Context,
    Event,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

from src.utils.paths import DataPaths, PromptPaths


def read(fname: Path) -> str:
    with open(fname) as f:
        return f.read()


def write(fname: Path, data: str) -> None:
    fname.parent.mkdir(parents=True, exist_ok=True)
    with open(fname, 'w') as f:
        f.write(data)


def load_dir(dirname: Path) -> list:
    posts = []
    for fpath in Path(dirname).glob('*.md'):
        post = frontmatter.load(fpath)
        post['fname'] = fpath.name
        posts.append(post)
    return posts


def render(template_name: str, **kwargs) -> str:
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(searchpath=PromptPaths.templates_dir()),
    )
    template = env.get_template(template_name)
    return template.render(**kwargs)


def render_string(template_string: str, **kwargs) -> str:
    env = jinja2.Environment()
    template = env.from_string(template_string)
    return template.render(**kwargs)
    

class FileStreamer:
    def __init__(self, fname: Path) -> None:
        self.fname = fname
        fname.parent.mkdir(parents=True, exist_ok=True)
    
    def write(self, data: str) -> None:
        with open(self.fname, 'a') as f:
            f.write(data)


class BaseModel:
    # To be defined by subclass
    models = {
        # All prices in USD per million 'i' (input) tokens and 'o' (output) tokens
        'model-name': {
            'name': 'upstream-model-name',
            'price': { 'i': Decimal('0.0'), 'o': Decimal('0.0') },
        },
    }

    def __init__(self):
        self.model_name = None  # To be set by subclass
        self._usage = {
            'input_tokens': 0,
            'output_tokens': 0,
            'cache_write_tokens': 0,
            'cache_read_tokens': 0,
        }

    def set_usage(self, input_tokens, output_tokens, cache_write_tokens=0, cache_read_tokens=0):
        self._usage['input_tokens'] = input_tokens
        self._usage['output_tokens'] = output_tokens
        self._usage['cache_write_tokens'] = cache_write_tokens
        self._usage['cache_read_tokens'] = cache_read_tokens

    def compute_price(self, base_model=None):
        if base_model is None:
            base_model = self.model_name

        input_tokens = self._usage['input_tokens']
        output_tokens = self._usage['output_tokens']
        cache_write_tokens = self._usage['cache_write_tokens']
        cache_read_tokens = self._usage['cache_read_tokens']
        
        # Compute the price of the prompt and completion tokens for the current model
        price = self.models[base_model]['price']
        
        i_price = Decimal(input_tokens) * price['i'] / Decimal(1_000_000)
        o_price = Decimal(output_tokens) * price['o'] / Decimal(1_000_000)
        cw_price = Decimal(cache_write_tokens) * price['cw'] / Decimal(1_000_000)
        cr_price = Decimal(cache_read_tokens) * price['cr'] / Decimal(1_000_000)
        total_price = i_price + o_price + cw_price + cr_price
        
        # force decimal to string conversion, with 5 digits of precision
        six_zeros = Decimal('0.000000')
        usage = {
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cache_write_tokens': cache_write_tokens,
            'cache_read_tokens': cache_read_tokens,
            'input_price_usd': str(i_price.quantize(six_zeros)),
            'output_price_usd': str(o_price.quantize(six_zeros)),
            'cache_write_price_usd': str(cw_price.quantize(six_zeros)),
            'cache_read_price_usd': str(cr_price.quantize(six_zeros)),
            'total_price_usd': str(total_price.quantize(six_zeros)),
        }
        return usage

    def finalize(self):
        '''
        Example response:
        {
            'model': 'model_name',
            'usage': {
                'input_tokens': 1234,
                'output_tokens': 1234,
                'input_price_usd': '0.000000',
                'output_price_usd': '0.000000',
                'total_price_usd': '0.000000',
            }
        }
        '''
        usage = self.compute_price()
        return {'model': self.model_name, 'usage': usage}


class AnthropicModel(BaseModel):
    models = {
        # https://www.anthropic.com/pricing#anthropic-api
        'claude-3-haiku': {
            'name': 'claude-3-haiku-20240307',
            'price': {
                'i': Decimal('0.25'),
                'o': Decimal('1.25'),
                'cw': Decimal('0.30'), # cache write
                'cr': Decimal('0.03'), # cache read
            },
            'context': 200_000,
        },
        'claude-3.5-haiku': {
            'name': 'claude-3-5-haiku-latest',
            'price': {
                'i': Decimal('0.80'),
                'o': Decimal('4.00'),
                'cw': Decimal('1.25'), # cache write
                'cr': Decimal('0.10'), # cache read
            },
            'context': 200_000,
        },
        'claude-3.5-sonnet': {
            'name': 'claude-3-5-sonnet-latest',
            'price': {
                'i': Decimal('3.00'),
                'o': Decimal('15.00'),
                'cw': Decimal('3.75'), # cache write
                'cr': Decimal('0.30'), # cache read
            },
            'context': 200_000,
        },
        'claude-3-opus': {
            'name': 'claude-3-opus-latest',
            'price': {
                'i': Decimal('15.00'),
                'o': Decimal('75.00'),
                'cw': Decimal('18.75'), # cache write
                'cr': Decimal('1.50'), # cache read
            },
            'context': 200_000,
        },
    }

    def __init__(self, model_name, api_key):
        super().__init__()

        self.model_name = model_name
        self.api_key = api_key
        self.client = AsyncAnthropic(api_key=api_key)

    async def astream_chat(self, messages, system_prompt=None, temperature=None, max_tokens=None, top_k=None, top_p=None, include_raw=False):
        cfg = {}
        if system_prompt is not None:
            cfg['system'] = system_prompt
        if temperature is not None:
            cfg['temperature'] = max(0.0, min(1.0, temperature))
        if max_tokens is not None:
            cfg['max_tokens'] = max_tokens
        if top_k is not None:
            cfg['top_k'] = top_k
        if top_p is not None:
            cfg['top_p'] = top_p
        
        remote_name = self.models[self.model_name]['name']
        
        async with self.client.messages.stream(
            model=remote_name,
            messages=messages,
            **cfg,
        ) as stream:
            async for chunk in stream:
                raw_chunk = chunk.to_dict()
                norm_chunk = self.process(raw_chunk)
                if norm_chunk['delta'] == '' and not include_raw:
                    continue
                if include_raw:
                    norm_chunk['_raw'] = raw_chunk
                yield norm_chunk
        yield self.finalize()

    async def astream_chat_to(self, fname, messages, max_tokens=8000, stdout=False, **kwargs):
        stream = FileStreamer(fname)
        
        resp_text = ''
        usage = None
        async for chunk in self.astream_chat(messages, max_tokens=max_tokens, **kwargs):
            if 'usage' in chunk:
                usage = chunk['usage']
                continue
            if chunk['delta'] == '':
                continue
            if stdout:
                print(chunk['delta'], end="", flush=True)
            stream.write(chunk['delta'])
            resp_text += chunk['delta']
        
        # write final response with metadata as frontmatter
        post = frontmatter.Post(resp_text)
        post['model'] = self.model_name
        post['timestamp'] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        post['usage'] = usage
        write(fname, frontmatter.dumps(post))
        
        # return the response text
        return resp_text, usage

    def process(self, chunk) -> str:
        '''
        {
            "delta": {
                "text": "Here's",
                "type": "text_delta"
            },
            "index": 0,
            "type": "content_block_delta"
        }

        {
            "type": "message_stop",
            "message": {
                "id": "msg_01HEK4B93mFKv5qQrtsRHhfA",
                "content": [
                    {
                        "text": "Here's a short joke...",
                        "type": "text"
                    }
                ],
                "model": "claude-3-5-sonnet-20240620",
                "role": "assistant",
                "stop_reason": "end_turn",
                "stop_sequence": null,
                "type": "message",
                "usage": {
                    "input_tokens": 15,
                    "output_tokens": 37
                }
            }
        }                
        '''
        if chunk['type'] == 'content_block_delta':
            delta = chunk['delta']['text']
        else:
            delta = ''
        
        norm_chunk = {
            'delta': delta
        }

        if chunk['type'] == 'message_stop':
            self.set_usage(
                cache_write_tokens=chunk['message']['usage'].get('cache_creation_input_tokens', 0),
                cache_read_tokens=chunk['message']['usage'].get('cache_read_input_tokens', 0),
                input_tokens=chunk['message']['usage']['input_tokens'],
                output_tokens=chunk['message']['usage']['output_tokens'],                
            )
        return norm_chunk


def add_usage(usage1, usage2):
    """
    Combines usage statistics from two API calls, adding up tokens and prices.
    
    Args:
        usage1 (dict): First usage dictionary
        usage2 (dict): Second usage dictionary
        
    Returns:
        dict: Combined usage statistics
    """
    combined = {}
    
    # Add token counts
    token_fields = ['input_tokens', 'output_tokens', 'cache_write_tokens', 'cache_read_tokens']
    for field in token_fields:
        combined[field] = usage1.get(field, 0) + usage2.get(field, 0)
    
    # Add prices (converting from string back to Decimal for precision)
    price_fields = ['input_price_usd', 'output_price_usd', 'cache_write_price_usd', 
                   'cache_read_price_usd', 'total_price_usd']
    for field in price_fields:
        price1 = Decimal(usage1.get(field, '0.000000'))
        price2 = Decimal(usage2.get(field, '0.000000'))
        combined[field] = str((price1 + price2).quantize(Decimal('0.000000')))
    
    return combined


class SchoolStart(Event):
    school_name: str
    school_dir: Path


class SchoolVirtueShortlistStart(Event):
    school_name: str
    school_dir: Path
    conversation: list[dict]
    usage: dict


class SchoolVirtuesYamlStartOrContinue(Event):
    school_name: str
    school_dir: Path
    continue_iter: int
    conversation: list[dict]
    usage: dict


class SchoolDone(Event):
    school_name: str
    school_dir: Path
    usage: dict


class AllSchoolsWorkflow(Workflow):
    @step
    async def entry(self, ctx: Context, ev: StartEvent) -> SchoolStart:
        await ctx.set('prompts', ev.prompts)
        await ctx.set('model', ev.model)
        await ctx.set('school_count', len(ev.schools))
        
        run_dir = DataPaths.schools_dir(ev.version) / ev.run_id
        await ctx.set('run_dir', run_dir)
        
        # priming system prompt cache
        system = ev.prompts['cached_system']
        messages = [
            {
                'role': 'user',
                'content': 'Please confirm that you are ready to begin.',
            }
        ]
        model = AnthropicModel(ev.model, os.environ.get('ANTHROPIC_API_KEY'))
        _, init_usage = await model.astream_chat_to(run_dir / 'init.md', messages, max_tokens=8000, stdout=False, system_prompt=system)
        await ctx.set('all_usage', [init_usage])

        for school in ev.schools:
            ctx.send_event(SchoolStart(school_name=school['school_name'], school_dir=school['school_dir']))

    @step(num_workers=4)
    async def school(self, ctx: Context, ev: SchoolStart) -> SchoolVirtueShortlistStart:
        print(f"  [{ev.school_name}] Recalling information")
        
        prompts = await ctx.get('prompts')
        model = await ctx.get('model')
        system = prompts['cached_system']
        instruction = render_string(prompts['1-school.jinja2'], school_name=ev.school_name)
        messages = [
            {
                'role': 'user',
                'content': instruction,
            }
        ]
        
        dest_stem = ev.school_dir / '1-school'
        dest_prompt = dest_stem.with_suffix('.json')
        full_prompt = {
            'system': system,
            'messages': messages,
        }
        with open(dest_prompt, 'w') as f:
            json.dump(full_prompt, f, indent=2)
        
        dest_md = dest_stem.with_suffix('.md')
        model = AnthropicModel(model, os.environ.get('ANTHROPIC_API_KEY'))
        response, turn_usage = await model.astream_chat_to(dest_md, messages, max_tokens=8000, stdout=False, system_prompt=system)
        messages.append({
            'role': 'assistant',
            'content': response,
        })
        return SchoolVirtueShortlistStart(school_name=ev.school_name, school_dir=ev.school_dir, conversation=messages.copy(), usage=turn_usage)

    @step
    async def school_virtue_shortlist(self, ctx: Context, ev: SchoolVirtueShortlistStart) -> SchoolVirtuesYamlStartOrContinue:
        print(f"  [{ev.school_name}] Creating shortlist")
        
        prompts = await ctx.get('prompts')
        model = await ctx.get('model')
        system = prompts['cached_system']
        instruction = prompts['2-shortlist.txt']
        messages = ev.conversation
        messages.append({
            'role': 'user',
            'content': instruction,
        })

        dest_stem = ev.school_dir / '2-shortlist'
        dest_prompt = dest_stem.with_suffix('.json')
        full_prompt = {
            'system': system,
            'messages': messages,
        }
        with open(dest_prompt, 'w') as f:
            json.dump(full_prompt, f, indent=2)
        
        dest_md = dest_stem.with_suffix('.md')
        model = AnthropicModel(model, os.environ.get('ANTHROPIC_API_KEY'))
        response, turn_usage = await model.astream_chat_to(dest_md, messages, max_tokens=8000, stdout=False, system_prompt=system)
        messages.append({
            'role': 'assistant',
            'content': response,
        })
        cumm_usage = add_usage(ev.usage, turn_usage)
        return SchoolVirtuesYamlStartOrContinue(school_name=ev.school_name, school_dir=ev.school_dir, conversation=messages.copy(), usage=cumm_usage, continue_iter=0)

    @step
    async def school_virtues_yaml(self, ctx: Context, ev: SchoolVirtuesYamlStartOrContinue) -> SchoolDone:
        print(f"  [{ev.school_name}] Creating YAML nodes (iteration {ev.continue_iter})")

        prompts = await ctx.get('prompts')
        model = await ctx.get('model')
        system = prompts['cached_system']
        
        if ev.continue_iter > 0:
            instruction = 'Please continue.'
        else:
            instruction = prompts['3-yaml.txt']
        
        messages = ev.conversation
        messages.append({
            'role': 'user',
            'content': instruction,
        })

        dest_stem = ev.school_dir / f'3-yaml-iter-{ev.continue_iter}'
        dest_prompt = dest_stem.with_suffix('.json')
        full_prompt = {
            'system': system,
            'messages': messages,
        }
        with open(dest_prompt, 'w') as f:
            json.dump(full_prompt, f, indent=2)
        
        dest_md = dest_stem.with_suffix('.md')
        model = AnthropicModel(model, os.environ.get('ANTHROPIC_API_KEY'))
        response, turn_usage = await model.astream_chat_to(dest_md, messages, max_tokens=8000, stdout=False, system_prompt=system)
        messages.append({
            'role': 'assistant',
            'content': response,
        })
        cumm_usage = add_usage(ev.usage, turn_usage)

        data_dir = ev.school_dir / 'nodes'
        data_dir.mkdir(parents=True, exist_ok=True)

        print(f"  [{ev.school_name}] Writing YAML blocks to {data_dir}")

        # Extract YAML blocks and write to files
        # Match both ```yaml and ``` code blocks
        yaml_blocks = re.finditer(r'```(?:yaml)?\n(.*?)\n```', response, re.DOTALL)
        
        for match in yaml_blocks:
            content = match.group(1).strip()
            # Skip empty blocks
            if not content:
                continue
            
            # Parse the content as frontmatter to extract the id
            try:
                post = frontmatter.loads(content)
                if 'id' in post.metadata:
                    fname = f"{post.metadata['id']}.md"
                else:
                    # Create MD5 hash of the content if no id is present
                    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
                    fname = f"{content_hash}.md"
                    print(f"  [{ev.school_name}] Warning: Missing 'id' in frontmatter, using hash: {content_hash}")
                
                yaml_file = data_dir / fname
                write(yaml_file, content)
            except Exception as e:
                print(f"  [{ev.school_name}] Error processing YAML block: {e}")
                continue
        
        if response.strip().endswith('[CONTINUE]'):
            return SchoolVirtuesYamlStartOrContinue(school_name=ev.school_name, school_dir=ev.school_dir, conversation=messages.copy(), usage=cumm_usage, continue_iter=ev.continue_iter + 1)
        else:
            return SchoolDone(school_name=ev.school_name, school_dir=ev.school_dir, usage=cumm_usage)

    @step
    async def collect_schools(self, ctx: Context, ev: SchoolDone) -> StopEvent:
        print(f"  [{ev.school_name}] Done, exporting usage data")

        usage_file = ev.school_dir / 'usage-school.json'
        with open(usage_file, 'w') as f:
            json.dump(ev.usage, f, indent=2)
        
        all_usage = await ctx.get('all_usage')
        all_usage.append(ev.usage.copy())
        await ctx.set('all_usage', all_usage)
        
        count = await ctx.get('school_count')
        result = ctx.collect_events(ev, [SchoolDone] * count)
        if result is None:
            return None

        print(f"Processed {len(all_usage)} schools")

        # compute total usage as the sum of all usage entries in ALL_USAGE, using add_usage 
        total_usage = {}
        for usage in all_usage:
            total_usage = add_usage(total_usage, usage)

        run_dir = await ctx.get('run_dir')
        with open(run_dir / 'usage.json', 'w') as f:
            json.dump(total_usage, f, indent=2)

        return StopEvent()


async def main(version: str, run_id: str = None, model: str = 'claude-3.5-sonnet'):
    # Load prompts
    prompts = {}
    templates_dir = PromptPaths.templates_dir()
    for template in ['0-system.txt', '1-school.jinja2', '2-shortlist.txt', '3-yaml.txt']:
        prompt_file = templates_dir / template
        prompts[template] = read(prompt_file)
    
    prompts['cached_system'] = [{
        "type": "text",
        "text": prompts['0-system.txt'],
        "cache_control": {"type": "ephemeral"}
    }]
    
    # Read targets
    targets_file = PromptPaths.get_target(version)
    with open(targets_file) as f:
        targets = json.load(f)

    # Generate schools list
    schools = []
    run_dir = DataPaths.schools_dir(version)
    if run_id:
        run_dir = run_dir / run_id

    for ix, period in enumerate(targets):
        period_name = period['period']
        period_slug = slugify(period['period'])
        period_dir = run_dir / (str(ix) + '-' + period_slug)
        period_dir.mkdir(parents=True, exist_ok=True)

        for tradition in period['traditions']:
            tradition_name = period_name + ' -> ' + tradition['name']
            tradition_slug = slugify(tradition['name'])
            tradition_dir = period_dir / tradition_slug
            tradition_dir.mkdir(parents=True, exist_ok=True)

            for school in tradition['schools']:
                school_name = tradition_name + ' -> **' + school + '**'
                school_slug = slugify(school)
                school_dir = tradition_dir / school_slug
                school_dir.mkdir(parents=True, exist_ok=True)

                schools.append({
                    'school_name': school_name,
                    'school_dir': school_dir,
                })
    
    print(f"Read {len(schools)} schools from file {targets_file}")
    
    w = AllSchoolsWorkflow(timeout=None, verbose=True)
    await w.run(
        schools=schools,
        prompts=prompts,
        model=model,
        version=version,
        run_id=run_id,
    )


if __name__ == '__main__':
    VERSION = 'v1'
    RUN_ID = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d-%H-%M-%S")
    # RUN_ID = None  # Use this to write directly to version directory
    
    asyncio.run(main(
        version=VERSION,
        run_id=RUN_ID,
        model='claude-3.5-sonnet',
    ))
