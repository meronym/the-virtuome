# The Human Virtuome Project

A comprehensive computational pipeline for analyzing and mapping human virtues across cultures, traditions, and time periods. This project uses AI models to systematically catalog virtues, their relationships, and practical applications, followed by advanced analysis and visualization techniques.

## Project Overview

The Human Virtuome Project aims to create a comprehensive catalog of human virtues across different philosophical traditions, cultures, and historical periods. The project combines AI-powered content generation with sophisticated analysis techniques to:

1. Document and analyze virtues from various traditions
2. Map relationships between virtue concepts
3. Visualize connections and clusters of related virtues
4. Preserve historical and cultural context
5. Bridge ancient wisdom with contemporary relevance

### Versioning Strategy

The project uses semantic versioning (v1, v2, etc.) across all components:
- Templates: Versioned prompt templates in `prompts/templates/v{n}/`
- Data: Version-specific outputs in `data/{raw,processed}/v{n}/`
- Targets: Version-specific target definitions in `prompts/targets/v{n}.json`

This ensures consistency between prompts, generated content, and analysis results for each version of the system.

### Covered Traditions

The project currently analyzes virtues from these major traditions:

- Classical Philosophical Traditions
  - Greek Philosophy (c. 600 BCE - 300 CE)
  - Roman Philosophy (c. 100 BCE - 300 CE)

- Ancient Near Eastern & Mediterranean
  - Egyptian
  - Persian/Iranian
  - Mesopotamian

- Asian Philosophical-Religious Traditions
  - Indian (c. 1500 BCE - present)
  - Chinese (c. 1000 BCE - present)
  - Japanese
  - Korean

- Abrahamic Traditions
  - Jewish (c. 1200 BCE - present)
  - Christian (c. 30 CE - present)
  - Islamic (c. 600 CE - present)

- Indigenous Traditions
  - African
  - Americas
  - Pacific

- Medieval & Renaissance
  - European
  - Islamic Golden Age

- Modern Philosophical Frameworks
  - Enlightenment (17th-18th century)
  - 19th Century
  - 20th Century

- Contemporary Frameworks
  - Psychological
  - Social-Political
  - Applied Ethics
  - Modern Spiritual/Psychological

For a comprehensive list of covered traditions, see the [the v1 system prompt](prompts/templates/v1/0-system.txt) file.

## Generation Pipeline

The generation phase uses Claude (Anthropic's LLM) to systematically analyze and document virtues from each tradition:

### 1. Systematic Analysis
For each tradition, the system:
- Analyzes core texts and teachings
- Identifies explicit and implicit virtues
- Considers historical context
- Documents practical applications
- Maps interconnections with other virtues

### 2. Structured Documentation
Each virtue is documented in a structured YAML+Markdown format:

[code]
---
# Core Identification
id: tradition-specific-slug
name: virtue-name
tradition: specific-tradition

# Original Language
script:
  original_language: original-script
  transliteration: transliterated-form

# Classification
category: primary-category
subcategory: specific-type
related_concepts: 
  - related-virtue-1
  - related-virtue-2

# Historical Context
period: historical-period
source_texts: 
  - primary-source-1
  - primary-source-2

# Properties
type: virtue/value/principle/practice
scope: individual/interpersonal/social/universal
orientation: active/passive/balanced
---

# Detailed Description
[Structured content including definition, key aspects, 
historical development, and contemporary relevance]
[/code]

### 3. Quality Control
The generation process includes:
- Consistent formatting and structure
- Cross-referencing between related virtues
- Preservation of original language terms
- Historical accuracy verification
- Contemporary relevance assessment

## Project Structure

[code]
.
├── data/                     # Data storage
│   ├── processed/            # Processed data outputs
│   │   └── v1/              # Version-specific processed data
│   │       ├── voyage/      # Voyage AI analysis
│   │       │   ├── embeddings/
│   │       │   ├── pca/
│   │       │   │   └── clusters/
│   │       │   └── umap/
│   │       │       └── clusters/
│   │       ├── openai/      # OpenAI analysis
│   │       │   ├── embeddings/
│   │       │   ├── pca/
│   │       │   │   └── clusters/
│   │       │   └── umap/
│   │       │       └── clusters/
│   │       └── cohere/      # Cohere analysis
│   │           ├── embeddings/
│   │           ├── pca/
│   │           │   └── clusters/
│   │           └── umap/
│   │               └── clusters/
│   └── raw/                 # Raw generated data
│       └── v1/              # Version-specific raw data
│           ├── flat/        # Flattened content files
│           ├── tree.json    # Complete hierarchical tree structure
│           └── schools/     # Hierarchical school structure
│               └── nodes/   # Individual virtue nodes with tree_path.json
├── prompts/                 # LLM prompts and targets
│   ├── targets/            # Target definitions
│   │   ├── samples/        # Sample targets for testing
│   │   └── v1.json        # Main target definitions
│   └── templates/          # Prompt templates
│       └── v1/            # Version 1 templates
├── src/                    # Source code
│   ├── analysis/          # Analysis pipeline
│   ├── generation/        # Content generation
│   │   ├── generator.py   # Main generation workflow
│   │   ├── tree_paths.py  # Tree structure generation
│   │   └── llm_models.py  # LLM interaction and pricing
│   ├── utils/             # Shared utilities
│   └── web/              # Web visualization
├── requirements.txt       # Python dependencies
└── README.md             # This file
[/code]

## Setup

1. Create and activate a virtual environment:

[code]
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
[/code]

2. Install dependencies:

[code]
pip install -r requirements.txt
[/code]

3. Create a `.env` file with your API keys:

[code]
ANTHROPIC_API_KEY=your_key_here
VOYAGE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
[/code]

## Pipeline Overview

The project consists of several stages:

1. **Content Generation**
   - Uses Claude to generate philosophical content
   - Hierarchical structure of schools and virtues
   - Outputs markdown files with frontmatter metadata

2. **Tree Structure Generation**
   - Indexes generated content using `tree_paths.py`
   - Creates individual `tree_path.json` files for each school
   - Generates global `tree.json` with complete hierarchy
   - Run after content generation with:
     ```bash
     python -m src.generation.tree_paths prompts/targets/v1.json
     # Optional: dry run to preview changes
     python -m src.generation.tree_paths prompts/targets/v1.json --dry-run
     ```

3. **Version Migration**
   - Migrate data between versions using migration scripts
   - Transforms target files and raw data to new formats
   - Run migrations with:
     ```bash
     python -m src.migration.v1_to_v2  # Migrate from v1 to v2
     ```
   - Create new migrations by extending the base Migration class
   - Each migration defines how to:
     1. Transform the targets file structure
     2. Copy/transform raw data between versions
     3. Handle any version-specific changes

4. **Data Processing**
   - Flattens hierarchical content
   - Generates embeddings using Voyage AI
   - Performs dimensionality reduction (PCA and UMAP)
   - Clusters similar concepts

5. **Visualization**
   - Web-based interactive visualization
   - Multiple projection methods
   - Cluster analysis

## Usage

### 1. Generate Content

Generate philosophical schools and virtues:

[code]
# Generate using main target file
python -m src.generation.generator prompts/targets/v1.json

# Generate using a sample target file
python -m src.generation.generator prompts/targets/samples/v1-3.json

# Optional parameters
python -m src.generation.generator prompts/targets/v1.json --run-id custom-run --model claude-3-opus
[/code]

The generation pipeline uses a modular architecture:
- `generator.py`: Orchestrates the content generation workflow, inferring version from target filename
- `llm_models.py`: Handles LLM interactions, token usage tracking, and pricing
- `flattener.py`: Processes hierarchical content into flat structure

Flatten the hierarchical structure:

[code]
python -m src.generation.flattener
[/code]

### 2. Generate Embeddings

Create vector embeddings using specified provider:

[code]
python -m src.analysis.embeddings --provider voyage
python -m src.analysis.embeddings --provider openai
python -m src.analysis.embeddings --provider cohere
[/code]

### 3. Dimensionality Reduction

Generate PCA projection for specific provider:

[code]
python -m src.analysis.reduction-pca --provider voyage
[/code]

Generate UMAP projections with different parameters:

[code]
python -m src.analysis.reduction-umap --provider voyage
[/code]

### 4. Clustering

Perform clustering on provider-specific results:

[code]
python -m src.analysis.clustering v1 voyage pca.json
python -m src.analysis.clustering v1 voyage umap.json
[/code]


## Data Structure

### Target Definition

Target schools are defined in JSON format:

[code]
{
  "period": "Classical Philosophical Traditions",
  "traditions": [
    {
      "name": "Greek Philosophy",
      "schools": [
        "Platonism",
        "Aristotelianism",
        "Stoicism"
      ]
    }
  ]
}
[/code]

### Generated Content

Each school generates multiple virtue nodes in markdown format with frontmatter:

[code]
---
id: wisdom-stoic
school: Stoicism
virtue: Wisdom
category: Cardinal Virtues
---

Content describing the virtue...
[/code]

### Tree Structure

The project maintains two types of tree structure files:

1. Individual `tree_path.json` files in each school's nodes directory:
[code]
{
  "path": ["CLASSICAL PHILOSOPHICAL TRADITIONS", "Greek Philosophy (c. 600 BCE - 300 CE)", "Stoicism"],
  "nodes": ["wisdom-stoic", "justice-stoic", "courage-stoic", "temperance-stoic"]
}
[/code]

2. A global `tree.json` file containing the complete hierarchy:
[code]
[
  {
    "type": "period",
    "name": "CLASSICAL PHILOSOPHICAL TRADITIONS",
    "children": [
      {
        "type": "tradition",
        "name": "Greek Philosophy (c. 600 BCE - 300 CE)",
        "children": [
          {
            "type": "school",
            "name": "Stoicism",
            "children": [
              {
                "type": "virtue",
                "name": "wisdom-stoic"
              }
            ]
          }
        ]
      }
    ]
  }
]
[/code]

### Analysis Outputs

Embeddings and projections are stored in JSON format:

[code]
{
  "points": {
    "wisdom-stoic": {
      "x": 0.123,
      "y": 0.456
    }
  }
}
[/code]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
