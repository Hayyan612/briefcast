"""Thin wrapper over an OpenAI-compatible chat API (OpenRouter by default)."""

import json
from typing import Any

from openai import AsyncOpenAI

from app.config import get_settings


def make_client() -> AsyncOpenAI:
    s = get_settings()
    return AsyncOpenAI(base_url=s.llm_base_url, api_key=s.llm_api_key, timeout=120, max_retries=3)


def tool(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False,
            },
        },
    }


async def call_forced_tool(
    client: AsyncOpenAI, messages: list[dict], spec: dict, temperature: float = 0.4
) -> dict[str, Any]:
    """Ask the model for exactly one call of `spec` and return its parsed arguments."""
    name = spec["function"]["name"]
    resp = await client.chat.completions.create(
        model=get_settings().llm_model,
        messages=messages,
        tools=[spec],
        tool_choice={"type": "function", "function": {"name": name}},
        temperature=temperature,
    )
    calls = resp.choices[0].message.tool_calls or []
    if not calls:
        raise RuntimeError(f"Model did not call {name}")
    return json.loads(calls[0].function.arguments or "{}")
