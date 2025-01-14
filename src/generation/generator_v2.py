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


def render(template_name: str, version: str, **kwargs) -> str:
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(searchpath=PromptPaths.templates_version_dir(version)),
    )
    template = env.get_template(template_name)
    return template.render(**kwargs)


def render_string(template_string: str, **kwargs) -> str:
    env = jinja2.Environment()
    template = env.from_string(template_string)
    return template.render(**kwargs)


class VirtueStart(Event):
    virtue_name: str
    virtue_dir: Path
    conversation: list[dict]


class VirtueDone(Event):
    virtue_name: str
    virtue_dir: Path
    usage: dict


class AllVirtuesWorkflow(Workflow):
    @step
    async def entry(self, ctx: Context, ev: StartEvent) -> VirtueStart:
        await ctx.set('prompts', ev.prompts)
        await ctx.set('model', ev.model)
        await ctx.set('version', ev.version)
        
        run_dir = DataPaths.schools_dir(ev.version) / ev.run_id
        await ctx.set('run_dir', run_dir)
        
        virtue_count = 0
        all_usage = []

        for i, virtue in enumerate(ev.virtues):
            # Skip if the output file already exists
            if (virtue['virtue_dir'] / 'output.md').exists():
                print(f"Skipping virtue {i}: {virtue['virtue_name']} (output file already exists)")
                with open(virtue['virtue_dir'] / 'usage-virtue.json') as f:
                    usage = json.load(f)
                all_usage.append(usage)
                continue
            
            virtue_count += 1
            virtue_name = virtue['virtue_name'] if isinstance(virtue['virtue_name'], str) else virtue['virtue_id']
            print(f"Processing virtue {i}: {virtue_name} ({type(virtue['virtue_name'])})")
            ctx.send_event(VirtueStart(
                virtue_name=virtue_name,
                virtue_dir=virtue['virtue_dir'],
                conversation=virtue['messages']
            ))
                
        await ctx.set('virtue_count', virtue_count)
        await ctx.set('all_usage', all_usage)
    
    @step(num_workers=8)
    async def virtue(self, ctx: Context, ev: VirtueStart) -> VirtueDone:
        print(f"  [{ev.virtue_name}] Rephrasing virtue description")
        
        prompts = await ctx.get('prompts')
        model = await ctx.get('model')
        messages = ev.conversation.copy()

        system = prompts['cached_system']
        instruction = render_string(prompts['4-rephrase.jinja2'], virtue=ev.virtue_name)
        messages.append({
            'role': 'user',
            'content': instruction,
        })
        
        dest_stem = ev.virtue_dir / '4-rephrase'
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
        
        # Extract Markdown block and write to files
        # Match both ```markdown and ``` code blocks
        markdown_blocks = list(re.finditer(r'```(?:markdown)?\n(.*?)\n```', response, re.DOTALL))
        assert len(markdown_blocks) == 1
        
        content = markdown_blocks[0].group(1).strip()
        assert content

        markdown_file = ev.virtue_dir / f'output.md'
        write(markdown_file, content)
        
        return VirtueDone(virtue_name=ev.virtue_name, virtue_dir=ev.virtue_dir, usage=turn_usage)


    @step
    async def collect_virtues(self, ctx: Context, ev: VirtueDone) -> StopEvent:
        print(f"  [{ev.virtue_name}] Done, exporting usage data")

        usage_file = ev.virtue_dir / 'usage-virtue.json'
        with open(usage_file, 'w') as f:
            json.dump(ev.usage, f, indent=2)
        
        all_usage = await ctx.get('all_usage')
        all_usage.append(ev.usage.copy())
        await ctx.set('all_usage', all_usage)
        
        count = await ctx.get('virtue_count')
        result = ctx.collect_events(ev, [VirtueDone] * count)
        if result is None:
            return None

        print(f"Processed {len(all_usage)} virtues")

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
        version = targets_file.stem.split('-')[0]
    
    # Load prompts
    prompts = {}
    for template in ['0-system.txt', '4-rephrase.jinja2']:
        prompt_file = PromptPaths.get_template(version, template)
        prompts[template] = read(prompt_file)
    
    prompts['cached_system'] = [{
        "type": "text",
        "text": prompts['0-system.txt'],
        "cache_control": {"type": "ephemeral"}
    }]
    
    # Read targets
    with open(targets_file) as f:
        targets = json.load(f)

    # Generate virtues list
    virtues = []
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
                school_slug = slugify(school['name'])
                school_dir = tradition_dir / school_slug
                school_dir.mkdir(parents=True, exist_ok=True)

                v1_messages = school['v1_messages']
                messages = v1_messages[:-1]
                messages.append({
                    'role': 'assistant',
                    'content': [{
                        'type': 'text',
                        'text': v1_messages[-1]['content'],
                        'cache_control': {'type': 'ephemeral'},
                    }],
                })

                v1_nodes = school['v1_nodes']
                for node in v1_nodes.values():
                    virtue_name = node['metadata']['name']
                    virtue_id = node['metadata']['id']
                    virtue_dir = school_dir / virtue_id
                    virtue_dir.mkdir(parents=True, exist_ok=True)
                    virtues.append({
                        'virtue_name': virtue_name,
                        'virtue_id': virtue_id,
                        'virtue_dir': virtue_dir,
                        'messages': messages,
                    })
    
    print(f"Read {len(virtues)} virtues from file {targets_file}")
    
    w = AllVirtuesWorkflow(timeout=None, verbose=True)
    await w.run(
        virtues=virtues,
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
