#!/usr/bin/env python3

import argparse
import json
from pathlib import Path
from slugify import slugify

from src.utils.paths import DataPaths


def get_node_slugs(nodes_dir: Path) -> list[str]:
    """
    Get a list of node slugs from markdown files in the nodes directory.
    
    Args:
        nodes_dir: Path to the nodes directory
        
    Returns:
        List of node slugs (filenames without .md extension)
    """
    return [f.stem for f in nodes_dir.glob('*.md') if f.name != 'tree_path.json']


def create_tree_structure(targets_file: Path, version: str, schools_dir: Path) -> list:
    """
    Create hierarchical tree structure from targets file and node data.
    
    Args:
        targets_file: Path to the targets JSON file
        version: Version string (e.g. 'v1')
        schools_dir: Base directory for schools
        
    Returns:
        List of period nodes with nested tradition, school, and virtue nodes
    """
    # Read targets file
    with open(targets_file) as f:
        targets = json.load(f)
    
    tree = []
    
    # Process each period
    for ix, period in enumerate(targets):
        period_name = period['period']
        period_slug = slugify(period['period'])
        period_dir = schools_dir / (str(ix) + '-' + period_slug)
        
        period_node = {
            "type": "period",
            "name": period_name,
            "children": []
        }
        
        # Process each tradition
        for tradition in period['traditions']:
            tradition_name = tradition['name']
            tradition_slug = slugify(tradition['name'])
            tradition_dir = period_dir / tradition_slug
            
            tradition_node = {
                "type": "tradition",
                "name": tradition_name,
                "children": []
            }
            
            # Process each school
            for school in tradition['schools']:
                school_slug = slugify(school)
                school_dir = tradition_dir / school_slug
                nodes_dir = school_dir / 'nodes'
                
                school_node = {
                    "type": "school",
                    "name": school,
                    "children": []
                }
                
                # Add virtue nodes if directory exists
                if nodes_dir.exists():
                    node_slugs = get_node_slugs(nodes_dir)
                    for node_slug in sorted(node_slugs):
                        virtue_node = {
                            "type": "virtue",
                            "name": node_slug
                        }
                        school_node["children"].append(virtue_node)
                
                tradition_node["children"].append(school_node)
            
            period_node["children"].append(tradition_node)
        
        tree.append(period_node)
    
    return tree


def create_tree_paths(targets_file: Path, version: str, dry_run: bool = False) -> None:
    """
    Create tree_path.json files in each nodes directory based on the targets hierarchy.
    Also creates a global tree.json with the complete hierarchy.
    
    Args:
        targets_file: Path to the targets JSON file
        version: Version string (e.g. 'v1')
        dry_run: If True, only print what would be done without making changes
    """
    # Base directory for schools
    schools_dir = DataPaths.schools_dir(version)
    raw_dir = DataPaths.raw_dir(version)
    
    if dry_run:
        print("DRY RUN - no files will be created")
        print("=" * 50)
    
    # Create hierarchical tree structure
    tree = create_tree_structure(targets_file, version, schools_dir)
    
    # Write global tree.json
    tree_file = raw_dir / 'tree.json'
    if dry_run:
        print(f"Would create {tree_file} with content:")
        print(json.dumps(tree, indent=2))
        print("=" * 50)
    else:
        with open(tree_file, 'w') as f:
            json.dump(tree, f, indent=2)
        print(f"Created {tree_file}")
    
    # Read targets file for individual tree_path.json files
    with open(targets_file) as f:
        targets = json.load(f)
    
    # Process each period
    for ix, period in enumerate(targets):
        period_name = period['period']
        period_slug = slugify(period['period'])
        period_dir = schools_dir / (str(ix) + '-' + period_slug)
        
        # Process each tradition
        for tradition in period['traditions']:
            tradition_name = tradition['name']
            tradition_slug = slugify(tradition['name'])
            tradition_dir = period_dir / tradition_slug
            
            # Process each school
            for school in tradition['schools']:
                school_slug = slugify(school)
                school_dir = tradition_dir / school_slug
                nodes_dir = school_dir / 'nodes'
                
                # Skip if nodes directory doesn't exist
                if not nodes_dir.exists():
                    print(f"Warning: Nodes directory not found: {nodes_dir}")
                    continue
                
                # Get list of node slugs
                node_slugs = get_node_slugs(nodes_dir)
                
                # Create tree_path.json
                tree_path = {
                    "path": [period_name, tradition_name, school],
                    "nodes": sorted(node_slugs)  # Sort for consistency
                }
                
                tree_path_file = nodes_dir / 'tree_path.json'
                
                if dry_run:
                    print(f"Would create {tree_path_file} with content:")
                    print(json.dumps(tree_path, indent=2))
                    print("-" * 50)
                else:
                    with open(tree_path_file, 'w') as f:
                        json.dump(tree_path, f, indent=2)
                    print(f"Created {tree_path_file} with {len(node_slugs)} nodes")


def main():
    parser = argparse.ArgumentParser(description='Generate tree_path.json files in nodes directories')
    parser.add_argument('targets_file', type=Path, help='Path to the targets JSON file')
    parser.add_argument('--version', type=str, default='v1',
                       help='Version string (defaults to v1)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    create_tree_paths(
        targets_file=args.targets_file,
        version=args.version,
        dry_run=args.dry_run,
    )


if __name__ == '__main__':
    main() 