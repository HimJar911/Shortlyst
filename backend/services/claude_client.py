import asyncio
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

# ── Global concurrency limiter ───────────────────────────────────────────────
# Prevents TPM spikes by capping how many LLM calls run simultaneously.
_llm_semaphore: asyncio.Semaphore | None = None


def _get_llm_semaphore() -> asyncio.Semaphore:
    global _llm_semaphore
    if _llm_semaphore is None:
        _llm_semaphore = asyncio.Semaphore(settings.LLM_MAX_CONCURRENT)
    return _llm_semaphore


# ── Cached clients (avoid re-creating on every call) ─────────────────────────
_openai_client = None
_anthropic_client = None


def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic_client


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.0,
) -> str:
    async with _get_llm_semaphore():
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
    from openai import RateLimitError

    client = _get_openai_client()
    max_retries = settings.LLM_MAX_RETRIES
    base_delay = settings.LLM_RETRY_BASE_DELAY

    for attempt in range(max_retries):
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

        except RateLimitError as e:
            # Extract Retry-After hint from error message if available
            retry_after = _parse_retry_after(str(e))
            wait = retry_after if retry_after else base_delay * (2 ** attempt)

            if attempt < max_retries - 1:
                logger.warning(
                    f"OpenAI 429 rate limit (attempt {attempt + 1}/{max_retries}), "
                    f"waiting {wait:.1f}s before retry"
                )
                await asyncio.sleep(wait)
                continue
            else:
                logger.error(
                    f"OpenAI 429 rate limit — all {max_retries} retries exhausted"
                )
                raise

        except Exception as e:
            logger.error(f"OpenAI call failed: {e}")
            raise


def _parse_retry_after(error_message: str) -> float | None:
    """Extract retry delay from OpenAI error message like 'Please try again in 4.67s'."""
    try:
        if "Please try again in" in error_message:
            part = error_message.split("Please try again in")[1]
            # Extract the number before 's'
            num_str = ""
            for ch in part:
                if ch.isdigit() or ch == ".":
                    num_str += ch
                elif num_str:
                    break
            if num_str:
                return float(num_str) + 0.5  # add small buffer
    except (ValueError, IndexError):
        pass
    return None


async def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    client = _get_anthropic_client()
    max_retries = settings.LLM_MAX_RETRIES
    base_delay = settings.LLM_RETRY_BASE_DELAY

    for attempt in range(max_retries):
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
            error_str = str(e)
            is_rate_limit = "rate" in error_str.lower() or "429" in error_str

            if is_rate_limit and attempt < max_retries - 1:
                wait = base_delay * (2 ** attempt)
                logger.warning(
                    f"Anthropic rate limit (attempt {attempt + 1}/{max_retries}), "
                    f"waiting {wait:.1f}s before retry"
                )
                await asyncio.sleep(wait)
                continue

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
