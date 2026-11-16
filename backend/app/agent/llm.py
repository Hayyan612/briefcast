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
    """Get exactly one call of `spec` and return its parsed arguments.

    Some models (e.g. Claude Sonnet 5.5) reject a forced `tool_choice`, so we offer the
    single tool with tool_choice="auto", and re-ask once if the model answers in prose.
    """
    name = spec["function"]["name"]
    convo = [*messages, {"role": "user", "content": f"Respond by calling `{name}`."}]
    for _ in range(2):
        resp = await client.chat.completions.create(
            model=get_settings().llm_model,
            messages=convo,
            tools=[spec],
            tool_choice="auto",
            temperature=temperature,
        )
        msg = resp.choices[0].message
        for call in msg.tool_calls or []:
            if call.function.name == name:
                return json.loads(call.function.arguments or "{}")
        convo += [
            {"role": "assistant", "content": msg.content or ""},
            {"role": "user", "content": f"Call the `{name}` tool now. No prose."},
        ]
    raise RuntimeError(f"Model did not call {name}")
