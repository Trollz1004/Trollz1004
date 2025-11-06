"""
Claude API Integration via Anthropic SDK
"""

import os
import anthropic
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

class ClaudeClient:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.client = None
        self.default_model = "claude-3-sonnet-20240229"

    async def initialize(self):
        """Initialize Anthropic client"""
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY not set, Claude will be unavailable")
            return

        try:
            self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
            logger.info("Claude client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Claude client: {e}")

    async def generate(
        self,
        message: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: str = None
    ) -> Tuple[str, int]:
        """
        Generate response using Claude
        Returns: (response_text, tokens_used)
        """
        if not self.client:
            raise Exception("Claude client not initialized")

        try:
            response = await self.client.messages.create(
                model=model or self.default_model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "user", "content": message}
                ]
            )

            text = response.content[0].text
            tokens = response.usage.output_tokens

            return text, tokens

        except Exception as e:
            logger.error(f"Claude generation failed: {e}")
            raise

    async def is_available(self) -> bool:
        """Check if Claude is available"""
        if not self.client:
            return False

        try:
            # Quick test request
            await self.client.messages.create(
                model=self.default_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except:
            return False

    async def get_latency(self) -> float:
        """Measure average response latency in ms"""
        import time

        if not self.client:
            return -1.0

        try:
            start = time.time()
            await self.client.messages.create(
                model=self.default_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}]
            )
            return (time.time() - start) * 1000
        except:
            return -1.0
