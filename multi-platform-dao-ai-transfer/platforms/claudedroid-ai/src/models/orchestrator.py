"""
Model Orchestrator - Routes requests to appropriate AI models
Implements automatic fallback and load balancing
"""

import asyncio
import time
from typing import Tuple, List, Dict, Any
from datetime import datetime, timedelta
import logging

from integrations.claude import ClaudeClient
from integrations.localai import LocalAIClient
from integrations.ollama import OllamaClient

logger = logging.getLogger(__name__)

class ModelOrchestrator:
    def __init__(self):
        self.claude = ClaudeClient()
        self.localai = LocalAIClient()
        self.ollama = OllamaClient()

        self.start_time = time.time()
        self.request_counts = {}
        self.error_counts = {}

        # Priority order for auto routing
        self.model_priority = ["claude", "localai", "ollama"]

    async def initialize(self):
        """Initialize all model clients"""
        logger.info("Initializing model clients...")

        await asyncio.gather(
            self.claude.initialize(),
            self.localai.initialize(),
            self.ollama.initialize(),
            return_exceptions=True
        )

        # Initialize metrics
        for model in self.model_priority:
            self.request_counts[model] = 0
            self.error_counts[model] = 0

        logger.info("Model orchestrator initialized")

    async def route_request(
        self,
        message: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Tuple[str, str, int]:
        """
        Automatically route request to best available model
        Returns: (model_name, response_text, tokens_used)
        """
        # Try models in priority order
        for model_name in self.model_priority:
            try:
                if await self._is_model_healthy(model_name):
                    response, tokens = await self.process_with_model(
                        model=model_name,
                        message=message,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    return model_name, response, tokens
            except Exception as e:
                logger.warning(f"Model {model_name} failed, trying next: {e}")
                self.error_counts[model_name] += 1
                continue

        raise Exception("All models unavailable")

    async def process_with_model(
        self,
        model: str,
        message: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Tuple[str, int]:
        """
        Process request with specific model
        Returns: (model_name, response_text, tokens_used)
        """
        self.request_counts[model] = self.request_counts.get(model, 0) + 1

        if model == "claude":
            response, tokens = await self.claude.generate(message, max_tokens, temperature)
        elif model == "mistral" or model == "localai":
            response, tokens = await self.localai.generate(message, max_tokens, temperature)
        elif model == "ollama":
            response, tokens = await self.ollama.generate(message, max_tokens, temperature)
        else:
            raise ValueError(f"Unknown model: {model}")

        return model, response, tokens

    async def _is_model_healthy(self, model: str) -> bool:
        """Check if model is healthy and available"""
        if model == "claude":
            return await self.claude.is_available()
        elif model in ["mistral", "localai"]:
            return await self.localai.is_available()
        elif model == "ollama":
            return await self.ollama.is_available()
        return False

    async def get_all_models_status(self) -> List[Dict[str, Any]]:
        """Get status of all models"""
        statuses = []

        for model_name in ["claude", "localai", "ollama"]:
            try:
                is_online = await self._is_model_healthy(model_name)
                latency = await self._get_model_latency(model_name)

                requests = self.request_counts.get(model_name, 0)
                errors = self.error_counts.get(model_name, 0)
                error_rate = (errors / requests * 100) if requests > 0 else 0.0

                statuses.append({
                    "name": model_name,
                    "status": "online" if is_online else "offline",
                    "latency_ms": latency if latency > 0 else None,
                    "requests_24h": requests,
                    "error_rate": round(error_rate, 2)
                })
            except Exception as e:
                logger.error(f"Error checking {model_name} status: {e}")
                statuses.append({
                    "name": model_name,
                    "status": "error",
                    "latency_ms": None,
                    "requests_24h": 0,
                    "error_rate": 100.0
                })

        return statuses

    async def _get_model_latency(self, model: str) -> float:
        """Get model latency in milliseconds"""
        if model == "claude":
            return await self.claude.get_latency()
        elif model in ["mistral", "localai"]:
            return await self.localai.get_latency()
        elif model == "ollama":
            return await self.ollama.get_latency()
        return -1.0

    async def is_ready(self) -> bool:
        """Check if at least one model is ready"""
        statuses = await self.get_all_models_status()
        return any(s["status"] == "online" for s in statuses)

    def get_uptime(self) -> float:
        """Get uptime in seconds"""
        return time.time() - self.start_time

    async def list_models(self) -> Dict[str, Any]:
        """List all available models with details"""
        statuses = await self.get_all_models_status()
        return {
            "models": statuses,
            "default_priority": self.model_priority
        }

    async def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics"""
        total_requests = sum(self.request_counts.values())
        total_errors = sum(self.error_counts.values())

        return {
            "uptime_seconds": self.get_uptime(),
            "total_requests": total_requests,
            "total_errors": total_errors,
            "success_rate": ((total_requests - total_errors) / total_requests * 100) if total_requests > 0 else 100.0,
            "requests_per_model": self.request_counts,
            "errors_per_model": self.error_counts,
            "models": await self.get_all_models_status()
        }

    async def reload_model(self, model_name: str):
        """Reload a specific model"""
        logger.info(f"Reloading model: {model_name}")

        if model_name == "claude":
            await self.claude.initialize()
        elif model_name in ["mistral", "localai"]:
            await self.localai.initialize()
        elif model_name == "ollama":
            await self.ollama.initialize()

        # Reset metrics for reloaded model
        self.request_counts[model_name] = 0
        self.error_counts[model_name] = 0

        logger.info(f"Model {model_name} reloaded successfully")

    async def shutdown(self):
        """Cleanup all clients"""
        logger.info("Shutting down model clients...")
        await asyncio.gather(
            self.localai.shutdown(),
            self.ollama.shutdown(),
            return_exceptions=True
        )
        logger.info("All clients shut down")
