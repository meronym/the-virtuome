import shutil
import json
from pathlib import Path
from typing import Dict, List, Any

import frontmatter
from slugify import slugify

from src.migration.base import Migration
from src.utils.paths import DataPaths

class V1ToV2Migration(Migration):
    """Migration from v1 to v2 format that preserves generation history and nodes."""
    
    def __init__(self):
        super().__init__('v1', 'v2')
    
    def collect_school_data(self, school_dir: Path) -> Dict[str, Any]:
        """Collect v1 history and nodes data for a school.
        
        Args:
            school_dir: Path to the school directory
            
        Returns:
            Dict containing v1_history and v1_nodes data
        """
        # Read generation history from 3-yaml-iter-0.json
        history_file = school_dir / '3-yaml-iter-0.json'
        with open(history_file) as f:
            v1_history = json.load(f)
        del v1_history['system']
        
        # Read all markdown files from nodes directory
        nodes_dir = school_dir / 'nodes'
        v1_nodes = {}
        if nodes_dir.exists():
            for node_file in nodes_dir.glob('*.md'):
                node = {}
                with open(node_file) as f:
                    raw_post = f.read()
                metadata = frontmatter.loads(raw_post).metadata
                node['metadata'] = metadata
                node['content'] = raw_post
                v1_nodes[node_file.stem] = node
        
        synth_answer = '\n'.join(f'```\n{node["content"]}\n```\n' for node in v1_nodes.values()) + '\n[DONE]'
        v1_history['messages'].append({
            'role': 'assistant',
            'content': synth_answer
        })

        return {
            'v1_messages': v1_history['messages'],
            'v1_nodes': v1_nodes,
        }
    
    def migrate(self) -> None:
        """Execute the migration from v1 to v2.
        
        This migration:
        1. Collects generation history and nodes data for each school
        2. Augments the targets file with this data
        """
        
        # Load targets
        targets = self.load_source_targets()
        
        # Process each school using the same traversal logic as generator.py
        schools_dir = DataPaths.schools_dir(self.source_version)
        
        for ix, period in enumerate(targets):
            period_name = period['period']
            period_slug = slugify(period['period'])
            period_dir = schools_dir / (str(ix) + '-' + period_slug)
            
            for tradition in period['traditions']:
                tradition_name = tradition['name']
                tradition_slug = slugify(tradition['name'])
                tradition_dir = period_dir / tradition_slug
                
                for school in tradition['schools']:
                    school_slug = slugify(school)
                    school_dir = tradition_dir / school_slug
                    
                    try:
                        # Collect data for this school
                        school_data = self.collect_school_data(school_dir)
                        
                        # Add data to the school in the targets structure
                        # First find the matching school object
                        school_obj = next(
                            s for s in tradition['schools']
                            if (isinstance(s, str) and s == school) or
                               (isinstance(s, dict) and s['name'] == school)
                        )
                        
                        # Convert string school to dict if needed
                        if isinstance(school_obj, str):
                            idx = tradition['schools'].index(school_obj)
                            school_obj = {'name': school_obj}
                            tradition['schools'][idx] = school_obj
                            
                        # Add the v1 data
                        school_obj.update(school_data)
                        
                        print(f"Collected data for school: {school}")
                        
                    except Exception as e:
                        print(f"Error processing school {school}: {e}")
                        continue
        
        # Save transformed targets
        self.save_target_targets(targets)
        print(f"Created new targets file at {self.target_targets}")


if __name__ == '__main__':
    migration = V1ToV2Migration()
    migration.migrate()
