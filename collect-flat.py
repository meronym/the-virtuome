from pathlib import Path
import shutil
from collections import defaultdict

def collect_and_copy_node_markdown_files(root_dir, dest_dir):
    # Convert strings to Path objects
    root_path = Path(root_dir)
    dest_path = Path(dest_dir)
    
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
    root_directory = "data/v1"
    destination_directory = "data/v1-flat"
    
    try:
        copied_files = collect_and_copy_node_markdown_files(root_directory, destination_directory)
        
        print("\nSuccessfully copied files:")
        for file_path in copied_files:
            print(f"  - {file_path}")
        print(f"\nTotal files copied: {len(copied_files)}")
        print(f"Files copied to: {destination_directory}")
        
    except Exception as e:
        print(f"\nError: {e}")
