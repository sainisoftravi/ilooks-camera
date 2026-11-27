import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "iLook Cloud Video Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://ilook_user:ilook_secure_pass@ilook-postgres.ilook-system.svc.cluster.local:5432/ilook_db"
    )
    
    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_ILOOK_SUPER_SECRET_KEY_123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Media Server Config
    MEDIAMTX_INGEST_HOST: str = os.getenv("MEDIAMTX_INGEST_HOST", "stream.labstackops.top")
    MEDIAMTX_INGEST_RTSP_PORT: int = int(os.getenv("MEDIAMTX_INGEST_RTSP_PORT", "8554"))
    MEDIAMTX_WHEP_URL: str = os.getenv("MEDIAMTX_WHEP_URL", "https://stream.labstackops.top")
    
    # Internal shared secret for MediaMTX hooks
    MEDIAMTX_WEBHOOK_SECRET: str = os.getenv("MEDIAMTX_WEBHOOK_SECRET", "mediamtx_internal_webhook_secret_key")

    class Config:
        case_sensitive = True

settings = Settings()
