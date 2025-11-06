"""
Ollama Integration for local model inference
"""

import os
import aiohttp
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://ollama-service:11434")
        self.model_name = os.getenv("OLLAMA_MODEL", "llama2")
        self.session = None

    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info(f"Ollama client initialized at {self.base_url}")

    async def generate(
        self,
        message: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Tuple[str, int]:
        """
        Generate response using Ollama
        Returns: (response_text, estimated_tokens)
        """
        if not self.session:
            raise Exception("Ollama client not initialized")

        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": message,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                },
                "stream": False
            }

            async with self.session.post(url, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Ollama returned status {response.status}")

                data = await response.json()
                text = data.get("response", "")

                # Ollama doesn't return token count, estimate it
                tokens = len(text.split()) * 1.3  # Rough estimate

                return text, int(tokens)

        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise

    async def is_available(self) -> bool:
        """Check if Ollama is available"""
        if not self.session:
            return False

        try:
            url = f"{self.base_url}/api/tags"
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                return response.status == 200
        except:
            return False

    async def get_latency(self) -> float:
        """Measure average response latency in ms"""
        import time

        if not self.session:
            return -1.0

        try:
            start = time.time()
            await self.generate("test", max_tokens=10)
            return (time.time() - start) * 1000
        except:
            return -1.0

    async def shutdown(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
