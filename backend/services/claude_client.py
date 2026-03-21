from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.0,
) -> str:
    if settings.LLM_PROVIDER == "openai":
        return await _call_openai(system_prompt, user_prompt, max_tokens, temperature)
    else:
        return await _call_anthropic(
            system_prompt, user_prompt, max_tokens, temperature
        )


async def _call_openai(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    except Exception as e:
        logger.error(f"OpenAI call failed: {e}")
        raise


async def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        response = await client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.content[0].text

    except Exception as e:
        logger.error(f"Anthropic call failed: {e}")
        raise


async def call_llm_json(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2000,
) -> dict:
    import json

    full_system = (
        system_prompt
        + "\n\nYou must respond with valid JSON only. No markdown, no backticks, no explanation. Just the JSON object."
    )

    raw = await call_llm(full_system, user_prompt, max_tokens, temperature=0.0)

    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}")
        logger.error(f"Raw response was: {raw}")
        raise
