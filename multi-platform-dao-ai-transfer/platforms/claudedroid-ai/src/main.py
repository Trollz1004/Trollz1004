"""
ClaudeDroid AI Platform - Main FastAPI Application
Multi-model orchestration with Claude, Mistral, Ollama, and LocalAI
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import logging
from datetime import datetime

from integrations.claude import ClaudeClient
from integrations.localai import LocalAIClient
from integrations.ollama import OllamaClient
from models.orchestrator import ModelOrchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClaudeDroid AI Platform",
    description="Multi-model AI orchestration platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model clients
orchestrator = ModelOrchestrator()

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "auto"  # auto, claude, mistral, ollama
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: int
    latency_ms: float
    timestamp: str

class ModelStatus(BaseModel):
    name: str
    status: str  # online, offline, error
    latency_ms: Optional[float]
    requests_24h: int
    error_rate: float

class HealthResponse(BaseModel):
    status: str
    models: List[ModelStatus]
    uptime_seconds: float

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check with model status"""
    try:
        models_status = await orchestrator.get_all_models_status()
        return HealthResponse(
            status="healthy",
            models=models_status,
            uptime_seconds=orchestrator.get_uptime()
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    if await orchestrator.is_ready():
        return {"status": "ready"}
    raise HTTPException(status_code=503, detail="Not ready")

# Main chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint with automatic model selection
    """
    start_time = datetime.now()

    try:
        # Route to appropriate model
        if request.model == "auto":
            model_name, response, tokens = await orchestrator.route_request(
                message=request.message,
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )
        else:
            model_name, response, tokens = await orchestrator.process_with_model(
                model=request.model,
                message=request.message,
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )

        latency = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(f"Request processed by {model_name} in {latency:.2f}ms")

        return ChatResponse(
            response=response,
            model_used=model_name,
            tokens_used=tokens,
            latency_ms=latency,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Chat request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model-specific endpoints
@app.post("/chat/claude")
async def chat_claude(request: ChatRequest):
    """Direct Claude endpoint"""
    request.model = "claude"
    return await chat(request)

@app.post("/chat/mistral")
async def chat_mistral(request: ChatRequest):
    """Direct Mistral endpoint via LocalAI"""
    request.model = "mistral"
    return await chat(request)

@app.post("/chat/ollama")
async def chat_ollama(request: ChatRequest):
    """Direct Ollama endpoint"""
    request.model = "ollama"
    return await chat(request)

# Model management endpoints
@app.get("/models")
async def list_models():
    """List all available models"""
    return await orchestrator.list_models()

@app.post("/models/{model_name}/reload")
async def reload_model(model_name: str, background_tasks: BackgroundTasks):
    """Reload a specific model"""
    background_tasks.add_task(orchestrator.reload_model, model_name)
    return {"status": "reloading", "model": model_name}

@app.get("/metrics")
async def get_metrics():
    """Get platform metrics"""
    return await orchestrator.get_metrics()

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize all model clients on startup"""
    logger.info("Starting ClaudeDroid AI Platform...")
    await orchestrator.initialize()
    logger.info("All models initialized successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ClaudeDroid AI Platform...")
    await orchestrator.shutdown()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )
