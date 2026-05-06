from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.applications import router as applications_router

app = FastAPI(title="TrustLend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications_router)


@app.get("/")
async def root():
    return {
        "app": "TrustLend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": [
            "POST /api/apply",
            "GET /api/application/{id}",
            "GET /api/applications",
            "POST /api/demo/{scenario}",
        ],
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}
