import asyncio
from services.vision_service import assess_url_full
from services.playwright_service import should_skip_url, is_deployment_url
from utils.logger import get_logger

logger = get_logger(__name__)


def filter_deployment_urls(all_urls: list[str]) -> list[str]:
    """
    From all URLs on a resume, keep only ones worth checking.
    Skip social profiles, docs, package registries etc.
    Keep deployment URLs and any custom domains.
    """
    deployment_urls = []
    for url in all_urls:
        if should_skip_url(url):
            continue
        # Skip GitHub repo URLs — github_auditor handles those
        if "github.com/" in url.lower():
            continue
        deployment_urls.append(url)
    return deployment_urls


async def verify_deployments(all_urls: list[str]) -> dict:
    """
    Takes all URLs from a resume, filters to deployment candidates,
    checks each one with Playwright + Vision, returns structured signal.
    """
    deployment_urls = filter_deployment_urls(all_urls)

    if not deployment_urls:
        logger.info("No deployment URLs found to verify")
        return {
            "urls_checked": 0,
            "urls_found": 0,
            "live_count": 0,
            "real_app_count": 0,
            "deployments": [],
            "best_deployment": None,
            "signal": "none",
            "summary": "No deployed projects found on resume",
        }

    logger.info(f"Checking {len(deployment_urls)} deployment URLs: {deployment_urls}")

    # Run all URL checks in parallel
    tasks = [assess_url_full(url) for url in deployment_urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    deployments = []
    live_count = 0
    real_app_count = 0

    for url, result in zip(deployment_urls, results):
        if isinstance(result, Exception):
            logger.warning(f"URL check failed for {url}: {result}")
            deployments.append(
                {
                    "url": url,
                    "skipped": False,
                    "is_live": False,
                    "error": str(result),
                    "vision": None,
                }
            )
            continue

        if result.get("skipped"):
            continue

        is_live = result.get("is_live", False)
        vision = result.get("vision") or {}
        is_real = vision.get("is_real_app", False)

        if is_live:
            live_count += 1
        if is_live and is_real:
            real_app_count += 1

        deployments.append(
            {
                "url": url,
                "skipped": False,
                "is_live": is_live,
                "http_status": result.get("http_status"),
                "page_title": result.get("page_title"),
                "has_interactive_elements": result.get(
                    "has_interactive_elements", False
                ),
                "is_trivial": result.get("is_trivial", True),
                "vision": vision,
                "error": result.get("error"),
            }
        )

    # Find the best deployment — real app > live > anything
    best = None
    for d in deployments:
        if not d.get("is_live"):
            continue
        v = d.get("vision") or {}
        if v.get("is_real_app") and not v.get("is_template_or_clone"):
            if best is None:
                best = d
            else:
                # Prefer more complex apps
                complexity_rank = {
                    "trivial": 0,
                    "basic": 1,
                    "intermediate": 2,
                    "advanced": 3,
                }
                current_rank = complexity_rank.get(v.get("complexity", "trivial"), 0)
                best_rank = complexity_rank.get(
                    (best.get("vision") or {}).get("complexity", "trivial"), 0
                )
                if current_rank > best_rank:
                    best = d

    # Determine overall deployment signal
    if real_app_count >= 2:
        signal = "strong"
    elif real_app_count == 1:
        signal = "moderate"
    elif live_count >= 1:
        signal = "weak"
    else:
        signal = "none"

    # Build summary
    if real_app_count > 0:
        best_desc = (
            (best.get("vision") or {}).get("assessment", "real app")
            if best
            else "real app"
        )
        summary = f"{real_app_count} real deployed app(s) found. Best: {best_desc}"
    elif live_count > 0:
        summary = f"{live_count} live URL(s) found but no real apps detected — may be templates or landing pages"
    else:
        summary = f"{len(deployments)} URL(s) checked, none live"

    logger.info(f"Deployment verification complete: {signal} signal — {summary}")

    return {
        "urls_checked": len(deployments),
        "urls_found": len(deployment_urls),
        "live_count": live_count,
        "real_app_count": real_app_count,
        "deployments": deployments,
        "best_deployment": best,
        "signal": signal,
        "summary": summary,
    }
