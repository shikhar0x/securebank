"""Configuration module for SecureBank Backend (MySQL 8.0+).

Loads settings from environment variables and .env file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from repository root if present
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=env_path)


class Config:
    """Application configuration for MySQL."""

    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"
    TESTING = os.getenv("TESTING", "false").lower() in ("true", "1", "yes")

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-replace-in-production")

    # MySQL Database Connection Parameters
    DB_HOST = os.getenv("DB_HOST", "localhost").strip()
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "securebank").strip()
    DB_USER = os.getenv("DB_USER", "root").strip()
    DB_PASSWORD = os.getenv("DB_PASSWORD", "").strip()

    # Session cookie configuration for simple academic session auth
    SESSION_COOKIE_NAME = "securebank_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    @classmethod
    def get_db_config(cls) -> dict:
        """Return a dictionary of MySQL connection options."""
        return {
            "host": cls.DB_HOST,
            "port": cls.DB_PORT,
            "database": cls.DB_NAME,
            "user": cls.DB_USER,
            "password": cls.DB_PASSWORD,
            "charset": "utf8mb4",
            "autocommit": False,
        }

    @classmethod
    def is_db_configured(cls) -> bool:
        """Check if essential DB configuration parameters are provided."""
        return bool(cls.DB_HOST and cls.DB_NAME and cls.DB_USER)


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    DEBUG = True
    SECRET_KEY = "test-secret-key"


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False
    SESSION_COOKIE_SECURE = True


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config() -> type[Config]:
    """Retrieve the configuration class matching FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development").lower()
    return config_by_name.get(env, DevelopmentConfig)
