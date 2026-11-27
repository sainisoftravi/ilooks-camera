from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routes import auth, cameras, edge, mediamtx

# Auto-create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS configuration
origins = [
    "https://ilook.labstackops.top",
    "http://ilook.labstackops.top",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(edge.router, prefix=settings.API_V1_STR)
app.include_router(mediamtx.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": "ilook-auth-device-service",
        "platform": "OCI Ampere A1 ARM64",
        "version": "1.0.0"
    }

@app.get("/", tags=["system"])
def root():
    return {
        "brand": "iLook Commercial IP Camera Cloud Platform",
        "api_docs": f"{settings.API_V1_STR}/docs"
    }
