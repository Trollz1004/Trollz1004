"""
LocalAI Integration for self-hosted models (Mistral, etc.)
"""

import os
import aiohttp
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

class LocalAIClient:
    def __init__(self):
        self.base_url = os.getenv("LOCALAI_URL", "http://localai-service:8080")
        self.model_name = os.getenv("LOCALAI_MODEL", "mistral-7b-instruct")
        self.session = None

    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info(f"LocalAI client initialized at {self.base_url}")

    async def generate(
        self,
        message: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Tuple[str, int]:
        """
        Generate response using LocalAI
        Returns: (response_text, tokens_used)
        """
        if not self.session:
            raise Exception("LocalAI client not initialized")

        try:
            url = f"{self.base_url}/v1/chat/completions"
            payload = {
                "model": self.model_name,
                "messages": [{"role": "user", "content": message}],
                "max_tokens": max_tokens,
                "temperature": temperature
            }

            async with self.session.post(url, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"LocalAI returned status {response.status}")

                data = await response.json()
                text = data["choices"][0]["message"]["content"]
                tokens = data.get("usage", {}).get("total_tokens", 0)

                return text, tokens

        except Exception as e:
            logger.error(f"LocalAI generation failed: {e}")
            raise

    async def is_available(self) -> bool:
        """Check if LocalAI is available"""
        if not self.session:
            return False

        try:
            url = f"{self.base_url}/v1/models"
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
