import shutil
from pathlib import Path
from typing import Dict, List, Any

from src.migration.base import Migration

class V1ToV2Migration(Migration):
    """Example migration from v1 to v2 format."""
    
    def __init__(self):
        super().__init__('v1', 'v2')
    
    def migrate(self) -> None:
        """Execute the migration from v1 to v2.
        
        This example migration:
        1. Copies all raw data from v1 to v2
        2. Modifies the targets file to add new fields
        """
        # Copy raw data
        if self.source_raw.exists():
            shutil.copytree(self.source_raw, self.target_raw, dirs_exist_ok=True)
            print(f"Copied raw data from {self.source_raw} to {self.target_raw}")
        
        # Load and transform targets
        targets = self.load_source_targets()
        
        # Example transformation: Add metadata to each tradition
        for period in targets:
            for tradition in period['traditions']:
                # Add new metadata fields
                tradition['metadata'] = {
                    'time_period': tradition.get('name', '').split('(')[-1].strip(' )'),
                    'geographic_region': 'TBD',
                    'key_texts': [],
                    'major_figures': []
                }
        
        # Save transformed targets
        self.save_target_targets(targets)
        print(f"Created new targets file at {self.target_targets}")


if __name__ == '__main__':
    migration = V1ToV2Migration()
    migration.migrate() 