from pathlib import Path

# Base directories
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PROMPTS_DIR = PROJECT_ROOT / "prompts"


class DataPaths:
    """Utility class for managing data paths"""
    
    # Raw data paths
    @staticmethod
    def raw_dir(version: str) -> Path:
        """Get the raw data directory for a specific version"""
        return DATA_DIR / "raw" / version

    @staticmethod
    def schools_dir(version: str) -> Path:
        """Get the schools directory for a specific version"""
        return DataPaths.raw_dir(version) / "schools"

    @staticmethod
    def flat_dir(version: str) -> Path:
        """Get the flat directory for a specific version"""
        return DataPaths.raw_dir(version) / "flat"

    # Processed data paths
    @staticmethod
    def processed_dir(version: str) -> Path:
        """Get the processed data directory for a specific version"""
        return DATA_DIR / "processed" / version

    @staticmethod
    def provider_dir(version: str, provider: str) -> Path:
        """Get the provider-specific directory for a version"""
        return DataPaths.processed_dir(version) / provider

    @staticmethod
    def embeddings_dir(version: str, provider: str) -> Path:
        """Get the embeddings directory for a specific version and provider"""
        return DataPaths.provider_dir(version, provider) / "embeddings"

    @staticmethod
    def pca_dir(version: str, provider: str) -> Path:
        """Get the PCA directory for a specific version and provider"""
        return DataPaths.provider_dir(version, provider) / "pca"

    @staticmethod
    def umap_dir(version: str, provider: str) -> Path:
        """Get the UMAP directory for a specific version and provider"""
        return DataPaths.provider_dir(version, provider) / "umap"

    @staticmethod
    def clusters_dir(version: str, provider: str, viz_method: str) -> Path:
        """Get the clusters directory for a specific version, provider, and visualization method"""
        if viz_method == 'pca':
            return DataPaths.pca_dir(version, provider) / "clusters"
        elif viz_method == 'umap':
            return DataPaths.umap_dir(version, provider) / "clusters"
        else:
            raise ValueError(f"Invalid visualization method: {viz_method}")

    @staticmethod
    def ensure_provider_dirs(version: str, provider: str) -> None:
        """Create all necessary directories for a provider"""
        DataPaths.embeddings_dir(version, provider).mkdir(parents=True, exist_ok=True)
        pca_dir = DataPaths.pca_dir(version, provider)
        umap_dir = DataPaths.umap_dir(version, provider)
        
        # Create main directories
        pca_dir.mkdir(parents=True, exist_ok=True)
        umap_dir.mkdir(parents=True, exist_ok=True)
        
        # Create clusters subdirectories
        (pca_dir / "clusters").mkdir(exist_ok=True)
        (umap_dir / "clusters").mkdir(exist_ok=True)


class PromptPaths:
    """Utility class for managing prompt paths"""
    @staticmethod
    def templates_dir() -> Path:
        """Get the templates directory"""
        return PROMPTS_DIR / "templates"

    @staticmethod
    def templates_version_dir(version: str) -> Path:
        """Get the versioned templates directory"""
        return PromptPaths.templates_dir() / version

    @staticmethod
    def targets_dir() -> Path:
        """Get the targets directory"""
        return PROMPTS_DIR / "targets"

    @staticmethod
    def get_template(version: str, name: str) -> Path:
        """Get a specific template file"""
        return PromptPaths.templates_version_dir(version) / name

    @staticmethod
    def get_target(version: str) -> Path:
        """Get the target file for a specific version"""
        return PromptPaths.targets_dir() / f"{version}.json"

    @staticmethod
    def get_sample_target(version: str, sample: int) -> Path:
        """Get a sample target file"""
        return PromptPaths.targets_dir() / "samples" / f"{version}-{sample}.json"
