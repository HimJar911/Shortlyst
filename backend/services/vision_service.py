import asyncio
from config import settings
from services.claude_client import _get_llm_semaphore
from utils.logger import get_logger

logger = get_logger(__name__)

# Reuse the cached clients from claude_client to avoid creating new ones
_openai_vision_client = None


def _get_openai_vision_client():
    global _openai_vision_client
    if _openai_vision_client is None:
        from openai import AsyncOpenAI
        _openai_vision_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_vision_client


async def assess_screenshot(
    screenshot_base64: str,
    url: str,
    page_title: str | None,
    visible_text: str | None,
) -> dict:
    # Route through shared semaphore to prevent TPM spikes
    async with _get_llm_semaphore():
        if settings.LLM_PROVIDER == "openai":
            return await _assess_openai(screenshot_base64, url, page_title, visible_text)
        else:
            return await _assess_anthropic(screenshot_base64, url, page_title, visible_text)


async def _assess_openai(
    screenshot_base64: str,
    url: str,
    page_title: str | None,
    visible_text: str | None,
) -> dict:
    client = _get_openai_vision_client()

    prompt = f"""You are evaluating a deployed web project from a job candidate's portfolio.

URL: {url}
Page title: {page_title or 'Unknown'}
Visible text excerpt: {(visible_text or '')[:500]}

Look at the screenshot and answer these questions in JSON format:
{{
  "is_real_app": true/false,
  "app_type": "what type of app this appears to be (e.g. dashboard, e-commerce, portfolio, API, landing page, empty, error page)",
  "has_real_functionality": true/false,
  "is_template_or_clone": true/false,
  "complexity": "trivial/basic/intermediate/advanced",
  "assessment": "one sentence description of what this app actually is and does",
  "red_flags": "any concerns about authenticity or quality, or null if none"
}}

Be honest and critical. A real app has actual content, real functionality, and evidence the candidate built something. A fake or trivial app is a template, hello world, blank page, or something with no real content."""

    try:
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL_MINI,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{screenshot_base64}",
                                "detail": "low",
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
            max_tokens=500,
            temperature=0.0,
        )

        raw = response.choices[0].message.content or ""
        return _parse_vision_response(raw)

    except Exception as e:
        logger.error(f"Vision assessment failed for {url}: {e}")
        return _default_assessment()


async def _assess_anthropic(
    screenshot_base64: str,
    url: str,
    page_title: str | None,
    visible_text: str | None,
) -> dict:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are evaluating a deployed web project from a job candidate's portfolio.

URL: {url}
Page title: {page_title or 'Unknown'}
Visible text excerpt: {(visible_text or '')[:500]}

Look at the screenshot and answer these questions in JSON format:
{{
  "is_real_app": true/false,
  "app_type": "what type of app this appears to be",
  "has_real_functionality": true/false,
  "is_template_or_clone": true/false,
  "complexity": "trivial/basic/intermediate/advanced",
  "assessment": "one sentence description of what this app actually is and does",
  "red_flags": "any concerns about authenticity or quality, or null if none"
}}

Be honest and critical."""

    try:
        response = await client.messages.create(
            model=settings.LLM_MODEL_MINI,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": screenshot_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )

        raw = response.content[0].text
        return _parse_vision_response(raw)

    except Exception as e:
        logger.error(f"Vision assessment failed for {url}: {e}")
        return _default_assessment()


def _parse_vision_response(raw: str) -> dict:
    import json

    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Could not parse vision response as JSON: {raw[:200]}")
        return _default_assessment(assessment=raw[:300])


def _default_assessment(assessment: str = "Could not assess") -> dict:
    return {
        "is_real_app": False,
        "app_type": "unknown",
        "has_real_functionality": False,
        "is_template_or_clone": False,
        "complexity": "trivial",
        "assessment": assessment,
        "red_flags": None,
    }


async def assess_url_full(url: str) -> dict:
    from services.playwright_service import (
        check_url,
        should_skip_url,
        is_deployment_url,
    )

    if should_skip_url(url):
        return {
            "url": url,
            "skipped": True,
            "reason": "Non-deployment URL (LinkedIn, YouTube, docs, etc.)",
            "is_live": None,
            "vision": None,
        }

    playwright_result = await check_url(url)

    if not playwright_result["is_live"]:
        return {
            "url": url,
            "skipped": False,
            "is_live": False,
            "http_status": playwright_result["http_status"],
            "error": playwright_result["error"],
            "vision": None,
        }

    vision_result = None
    if playwright_result.get("screenshot_base64"):
        vision_result = await assess_screenshot(
            screenshot_base64=playwright_result["screenshot_base64"],
            url=url,
            page_title=playwright_result.get("page_title"),
            visible_text=playwright_result.get("visible_text"),
        )

    return {
        "url": url,
        "skipped": False,
        "is_live": True,
        "http_status": playwright_result["http_status"],
        "page_title": playwright_result.get("page_title"),
        "has_interactive_elements": playwright_result.get("has_interactive_elements"),
        "is_trivial": playwright_result.get("is_trivial"),
        "vision": vision_result,
        "error": None,
    }


async def assess_urls_batch(urls: list[str]) -> list[dict]:
    tasks = [assess_url_full(url) for url in urls]
    return await asyncio.gather(*tasks)
