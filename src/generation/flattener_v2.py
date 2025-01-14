from pathlib import Path
import shutil
from collections import defaultdict
from src.utils.paths import DataPaths


def collect_and_copy_node_markdown_files(version: str):
    """
    Collect and copy output.md files from the hierarchical schools structure to a flat directory.
    Each output.md file is copied with its parent directory name.
    
    Args:
        version: The version string (e.g., 'v2')
        
    Returns:
        List of copied file paths
    
    Raises:
        Exception: If name conflicts are found between parent directories
    """
    # Get source and destination directories
    root_path = DataPaths.schools_dir(version)
    dest_path = DataPaths.flat_dir(version)
    
    # Create destination directory if it doesn't exist
    dest_path.mkdir(parents=True, exist_ok=True)
    
    # Find all output.md files recursively
    output_files = list(root_path.rglob('output.md'))
    
    # Check for filename conflicts based on parent directory names
    filename_conflicts = defaultdict(list)
    for file_path in output_files:
        # Get parent directory name as the new filename
        new_filename = f"{file_path.parent.name}.md"
        filename_conflicts[new_filename].append(file_path)
    
    # Report and handle any conflicts
    conflicts_found = False
    for filename, paths in filename_conflicts.items():
        if len(paths) > 1:
            conflicts_found = True
            print(f"\nConflict found for parent directory name '{filename}' in locations:")
            for path in paths:
                print(f"  - {path}")
    
    if conflicts_found:
        raise Exception("Name conflicts found between parent directories. Please resolve conflicts before proceeding.")
    
    # Copy files to destination with parent directory names
    copied_files = []
    for source_path in output_files:
        new_filename = f"{source_path.parent.name}.md"
        dest_file = dest_path / new_filename
        shutil.copy2(source_path, dest_file)
        copied_files.append(dest_file)
    
    return copied_files


if __name__ == "__main__":
    VERSION = "v2"
    
    try:
        copied_files = collect_and_copy_node_markdown_files(VERSION)
        
        print("\nSuccessfully copied files:")
        for file_path in copied_files:
            print(f"  - {file_path}")
        print(f"\nTotal files copied: {len(copied_files)}")
        print(f"Files copied to: {DataPaths.flat_dir(VERSION)}")
        
    except Exception as e:
        print(f"\nError: {e}")
