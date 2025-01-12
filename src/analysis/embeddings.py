import asyncio
import os
import json
import argparse
from pathlib import Path
from typing import List, Dict

from dotenv import load_dotenv
load_dotenv()

import voyageai
import openai
from cohere import Client as CohereClient

from src.utils.paths import DataPaths

class BaseEmbeddingGenerator:
    def __init__(self, max_concurrent: int = 9):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
    async def embed_text(self, text: str) -> List[float]:
        raise NotImplementedError("Subclasses must implement embed_text")

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
                embedding = await self.embed_text(content)
                
                # Save embeddings to JSON file
                output_path.write_text(json.dumps(embedding))
                    
                print(f"Processed {md_file.name}")
                
            except Exception as e:
                print(f"Error processing {md_file.name}: {str(e)}")

    async def process_directory(self, version: str, provider: str):
        # Get input/output directories
        input_dir = DataPaths.flat_dir(version)
        output_dir = DataPaths.embeddings_dir(version, provider)
        
        # Create output directory if it doesn't exist
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get all markdown files
        md_files = list(sorted(input_dir.glob('*.md')))
        print(f"Found {len(md_files)} files to process")
        
        # Create tasks for all files
        tasks = [self.process_file(md_file, output_dir) for md_file in md_files]
        
        # Run all tasks concurrently
        await asyncio.gather(*tasks)

class VoyageEmbeddingGenerator(BaseEmbeddingGenerator):
    def __init__(self, api_key: str, model: str = "voyage-3", max_concurrent: int = 9):
        super().__init__(max_concurrent)
        self.client = voyageai.AsyncClient(api_key=api_key)
        self.model = model

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.embed([text], model=self.model)
        return response.embeddings[0]

class OpenAIEmbeddingGenerator(BaseEmbeddingGenerator):
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", max_concurrent: int = 9):
        super().__init__(max_concurrent)
        self.client = openai.AsyncClient(api_key=api_key)
        self.model = model

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model=self.model,
            input=text
        )
        return response.data[0].embedding

class CohereEmbeddingGenerator(BaseEmbeddingGenerator):
    def __init__(self, api_key: str, model: str = "embed-english-v3.0", max_concurrent: int = 9):
        super().__init__(max_concurrent)
        self.client = CohereClient(api_key=api_key)
        self.model = model

    async def embed_text(self, text: str) -> List[float]:
        # Cohere's client is synchronous, so we'll run it in an executor
        response = await asyncio.to_thread(
            self.client.embed,
            texts=[text],
            model=self.model
        )
        return response.embeddings[0]

PROVIDER_MAP = {
    'voyage': (VoyageEmbeddingGenerator, 'VOYAGE_API_KEY'),
    'openai': (OpenAIEmbeddingGenerator, 'OPENAI_API_KEY'),
    'cohere': (CohereEmbeddingGenerator, 'COHERE_API_KEY')
}

async def main():
    parser = argparse.ArgumentParser(description='Generate embeddings using specified provider')
    parser.add_argument('--provider', type=str, choices=PROVIDER_MAP.keys(), required=True,
                      help='Embedding provider to use')
    parser.add_argument('--version', type=str, default="v1",
                      help='Data version to process')
    args = parser.parse_args()
    
    generator_class, api_key_name = PROVIDER_MAP[args.provider]
    api_key = os.getenv(api_key_name)
    
    if not api_key:
        raise ValueError(f"Missing {api_key_name} in environment variables")
    
    generator = generator_class(api_key=api_key)
    await generator.process_directory(args.version, args.provider)

if __name__ == "__main__":
    asyncio.run(main())
