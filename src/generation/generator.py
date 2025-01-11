#! /usr/bin/env python3

import asyncio
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import argparse

from slugify import slugify
import frontmatter
import jinja2

from dotenv import load_dotenv
load_dotenv()

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
from src.generation.llm_models import AnthropicModel, add_usage


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

        # deduct the initial LLM call (that was used for priming the system prompt cache)
        print(f"Processed {len(all_usage) - 1} schools")

        # compute total usage as the sum of all usage entries in ALL_USAGE, using add_usage 
        total_usage = {}
        for usage in all_usage:
            total_usage = add_usage(total_usage, usage)

        run_dir = await ctx.get('run_dir')
        with open(run_dir / 'usage.json', 'w') as f:
            json.dump(total_usage, f, indent=2)

        return StopEvent()


async def main(targets_file: Path, run_id: str = None, model: str = 'claude-3.5-sonnet'):
    # Infer version from targets file name
    version = targets_file.stem
    if targets_file.parent.name == 'samples':
        # For sample files like v1-3.json in samples dir
        version = targets_file.stem
    
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
    parser = argparse.ArgumentParser(description='Generate virtue content from target definitions')
    parser.add_argument('targets_file', type=Path, help='Path to the targets JSON file')
    parser.add_argument('--run-id', type=str, 
                       default=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d-%H-%M-%S"),
                       help='Optional run ID (defaults to timestamp)')
    parser.add_argument('--model', type=str, default='claude-3.5-sonnet',
                       help='Model to use (defaults to claude-3.5-sonnet)')
    
    args = parser.parse_args()
    
    asyncio.run(main(
        targets_file=args.targets_file,
        run_id=args.run_id,
        model=args.model,
    ))
