"""
Migration module for transforming target files and raw data between versions.
"""

from pathlib import Path
from typing import Dict, List, Any

def load_target(target_file: Path) -> List[Dict[str, Any]]:
    """Load a target JSON file."""
    import json
    with open(target_file) as f:
        return json.load(f)

def save_target(target_file: Path, data: List[Dict[str, Any]]) -> None:
    """Save a target JSON file."""
    import json
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, 'w') as f:
        json.dump(data, f, indent=2) 