from pathlib import Path

# Base directories
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PROMPTS_DIR = PROJECT_ROOT / "prompts"

class DataPaths:
    """Utility class for managing data paths"""
    @staticmethod
    def raw_dir(version: str) -> Path:
        """Get the raw data directory for a specific version"""
        return DATA_DIR / "raw" / version

    @staticmethod
    def processed_dir(version: str) -> Path:
        """Get the processed data directory for a specific version"""
        return DATA_DIR / "processed" / version

    @staticmethod
    def schools_dir(version: str) -> Path:
        """Get the schools directory for a specific version"""
        return DataPaths.raw_dir(version) / "schools"

    @staticmethod
    def flat_dir(version: str) -> Path:
        """Get the flat directory for a specific version"""
        return DataPaths.raw_dir(version) / "flat"

    @staticmethod
    def embeddings_dir(version: str) -> Path:
        """Get the embeddings directory for a specific version"""
        return DataPaths.processed_dir(version) / "embeddings"

class PromptPaths:
    """Utility class for managing prompt paths"""
    @staticmethod
    def templates_dir() -> Path:
        """Get the templates directory"""
        return PROMPTS_DIR / "templates"

    @staticmethod
    def targets_dir() -> Path:
        """Get the targets directory"""
        return PROMPTS_DIR / "targets"

    @staticmethod
    def get_template(name: str) -> Path:
        """Get a specific template file"""
        return PromptPaths.templates_dir() / name

    @staticmethod
    def get_target(version: str) -> Path:
        """Get the target file for a specific version"""
        return PromptPaths.targets_dir() / f"{version}.json"

    @staticmethod
    def get_sample_target(version: str, sample: int) -> Path:
        """Get a sample target file"""
        return PromptPaths.targets_dir() / "samples" / f"{version}-{sample}.json" 