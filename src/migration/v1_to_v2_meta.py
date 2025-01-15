from pathlib import Path
import frontmatter
import yaml
from src.utils.paths import DataPaths

def parse_markdown_sections(content: str) -> dict:
    """Parse structured markdown content into sections"""
    sections = {}
    
    # Split content into lines and remove empty lines
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    
    current_section = None
    section_content = []
    
    # Sections that should be parsed as lists
    list_sections = {'key_aspects', 'related_practices'}
    quote_sections = {'notable_quotes'}
    
    for line in lines:
        if line.startswith('# '):  # H1 header
            sections['title'] = line[2:].strip()
        elif line.startswith('## '):  # H2 header
            # Save previous section if it exists
            if current_section:
                if current_section in list_sections:
                    sections[current_section] = [item for item in section_content]
                elif current_section in quote_sections:
                    sections[current_section] = [quote.strip() for quote in section_content]
                else:
                    sections[current_section] = '\n'.join(section_content).strip()
                section_content = []
            
            # Convert header to snake_case key
            current_section = line[3:].strip().lower().replace(' ', '_')
        elif current_section:
            if line.startswith('- '):
                if current_section in list_sections:
                    section_content.append(line[2:].strip())
                else:
                    section_content.append(line)
            elif line.startswith('> '):
                if current_section in quote_sections:
                    section_content.append(line[2:].strip())
                else:
                    section_content.append(line)
            else:
                section_content.append(line)
    
    # Save the last section
    if current_section:
        if current_section in list_sections:
            sections[current_section] = [item for item in section_content]
        elif current_section in quote_sections:
            sections[current_section] = [quote.strip() for quote in section_content]
        else:
            sections[current_section] = '\n'.join(section_content).strip()
    
    return sections

def migrate_v1_to_v2_meta():
    """Migrate v1 markdown files to v2 metadata files"""
    # Get source and destination directories
    v1_flat_dir = DataPaths.flat_dir("v1")
    v2_flat_dir = DataPaths.flat_dir("v2")
    
    # Create v2 flat directory if it doesn't exist
    v2_flat_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each markdown file
    for md_file in v1_flat_dir.glob("*.md"):
        # Parse the frontmatter
        post = frontmatter.load(md_file)
        
        # Get metadata and add post length
        metadata = post.metadata
        metadata['post_length'] = len(post.content)
        
        # Parse and add content sections to metadata
        content_sections = parse_markdown_sections(post.content)
        metadata.update(content_sections)
        
        # Create output filename
        output_file = v2_flat_dir / f"{md_file.stem}.meta.yaml"
        
        # Save metadata as YAML
        with open(output_file, 'w', encoding='utf-8') as f:
            yaml.dump(metadata, f, allow_unicode=True, sort_keys=False)

if __name__ == "__main__":
    migrate_v1_to_v2_meta()
