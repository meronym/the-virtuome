from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Any

from src.utils.paths import DataPaths, PromptPaths
from src.migration import load_target, save_target

class Migration(ABC):
    """Base class for migrations between versions."""
    
    def __init__(self, source_version: str, target_version: str):
        """Initialize migration.
        
        Args:
            source_version: Source version (e.g. 'v1')
            target_version: Target version (e.g. 'v2')
        """
        self.source_version = source_version
        self.target_version = target_version
        
        # Set up paths
        self.source_targets = PromptPaths.targets_dir() / f"{source_version}.json"
        self.target_targets = PromptPaths.targets_dir() / f"{target_version}.json"
        self.source_raw = DataPaths.raw_dir(source_version)
        self.target_raw = DataPaths.raw_dir(target_version)
    
    @abstractmethod
    def migrate(self) -> None:
        """Execute the migration from source to target version.
        
        This should:
        1. Read the source targets file
        2. Transform the targets data
        3. Save the new targets file
        4. Copy/transform any necessary raw data
        """
        pass
    
    def load_source_targets(self) -> List[Dict[str, Any]]:
        """Load the source targets file."""
        return load_target(self.source_targets)
    
    def save_target_targets(self, data: List[Dict[str, Any]]) -> None:
        """Save the target targets file."""
        save_target(self.target_targets, data) 