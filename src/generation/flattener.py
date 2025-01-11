from pathlib import Path
import shutil
from collections import defaultdict
from src.utils.paths import DataPaths

def collect_and_copy_node_markdown_files(version: str):
    """
    Collect and copy node markdown files from the hierarchical schools structure to a flat directory.
    
    Args:
        version: The version string (e.g., 'v1')
    """
    # Get source and destination directories
    root_path = DataPaths.schools_dir(version)
    dest_path = DataPaths.flat_dir(version)
    
    # Create destination directory if it doesn't exist
    dest_path.mkdir(parents=True, exist_ok=True)
    
    # Find all markdown files in 'nodes' directories
    markdown_files = []
    for nodes_dir in root_path.rglob('nodes'):
        if nodes_dir.is_dir():
            markdown_files.extend(sorted(nodes_dir.glob('*.md')))
    
    # Check for filename conflicts
    filename_count = defaultdict(list)
    for file_path in markdown_files:
        filename_count[file_path.name].append(file_path)
    
    # Report and handle any conflicts
    conflicts_found = False
    for filename, paths in filename_count.items():
        if len(paths) > 1:
            conflicts_found = True
            print(f"\nConflict found for filename '{filename}' in locations:")
            for path in paths:
                print(f"  - {path}")
    
    if conflicts_found:
        raise Exception("Name conflicts found. Please resolve conflicts before proceeding.")
    
    # Copy files to destination
    copied_files = []
    for source_path in markdown_files:
        dest_file = dest_path / source_path.name
        shutil.copy2(source_path, dest_file)
        copied_files.append(dest_file)
    
    return copied_files


if __name__ == "__main__":
    VERSION = "v1-3"  # This could be made configurable via command line arguments
    
    try:
        copied_files = collect_and_copy_node_markdown_files(VERSION)
        
        print("\nSuccessfully copied files:")
        for file_path in copied_files:
            print(f"  - {file_path}")
        print(f"\nTotal files copied: {len(copied_files)}")
        print(f"Files copied to: {DataPaths.flat_dir(VERSION)}")
        
    except Exception as e:
        print(f"\nError: {e}")
