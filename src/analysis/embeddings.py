import asyncio
import os
import json
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import voyageai

from src.utils.paths import DataPaths

class EmbeddingGenerator:
    def __init__(self, api_key: str, model: str = "voyage-3", max_concurrent: int = 9):
        self.client = voyageai.AsyncClient(api_key=api_key)
        self.model = model
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def process_file(self, md_file: Path, output_dir: Path):
        output_path = output_dir / md_file.name.replace('.md', '.json')
        
        # Skip if output file already exists
        if output_path.exists():
            print(f"Skipping {md_file.name} - embedding already exists")
            return
            
        # Read markdown content
        content = md_file.read_text(encoding='utf-8')
        
        # Generate embeddings
        async with self.semaphore:  # Limit concurrent requests
            try:
                response = await self.client.embed(
                    [content],
                    model=self.model,
                )
                
                # Save embeddings to JSON file
                output_path.write_text(json.dumps(response.embeddings[0]))
                    
                print(f"Processed {md_file.name}")
                
            except Exception as e:
                print(f"Error processing {md_file.name}: {str(e)}")

    async def process_directory(self, version: str):
        # Get input/output directories
        input_dir = DataPaths.flat_dir(version)
        output_dir = DataPaths.embeddings_dir(version)
        
        # Create output directory if it doesn't exist
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get all markdown files
        md_files = list(sorted(input_dir.glob('*.md')))
        print(f"Found {len(md_files)} files to process")
        
        # Create tasks for all files
        tasks = [self.process_file(md_file, output_dir) for md_file in md_files]
        
        # Run all tasks concurrently
        await asyncio.gather(*tasks)

async def main():
    VERSION = "v1"  # Could be made configurable via command line arguments
    
    generator = EmbeddingGenerator(
        api_key=os.getenv('VOYAGE_API_KEY'),
        model="voyage-3",
        max_concurrent=9
    )
    
    await generator.process_directory(VERSION)

if __name__ == "__main__":
    asyncio.run(main())
