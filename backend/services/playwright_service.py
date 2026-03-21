import asyncio
import base64
import sys
from typing import Optional
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class PlaywrightPool:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._semaphore = None
        self._lock = None
        self._initialized = False

    def _ensure_sync_primitives(self):
        """Create asyncio primitives lazily inside the running event loop."""
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(settings.PLAYWRIGHT_POOL_SIZE)
        if self._lock is None:
            self._lock = asyncio.Lock()

    async def initialize(self):
        self._ensure_sync_primitives()
        async with self._lock:
            if self._initialized:
                return
            logger.info("Initializing Playwright browser pool...")

            # On Windows, ensure ProactorEventLoop is active
            if sys.platform == "win32":
                loop = asyncio.get_event_loop()
                if not isinstance(loop, asyncio.ProactorEventLoop):
                    logger.warning(
                        "Not running on ProactorEventLoop — Playwright may fail on Windows"
                    )

            from playwright.async_api import async_playwright

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-extensions",
                ],
            )
            self._initialized = True
            logger.info("Playwright browser pool ready")

    async def shutdown(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._initialized = False
        logger.info("Playwright browser pool shut down")

    async def _get_context(self):
        """Get a browser context, initializing lazily if needed."""
        if not self._initialized:
            await self.initialize()
        return await self._browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            java_script_enabled=True,
            ignore_https_errors=True,
        )

    async def check_url(self, url: str) -> dict:
        self._ensure_sync_primitives()
        async with self._semaphore:
            return await self._check_url_internal(url)

    async def _check_url_internal(self, url: str) -> dict:
        result = {
            "url": url,
            "is_live": False,
            "http_status": None,
            "screenshot_base64": None,
            "page_title": None,
            "visible_text": None,
            "has_interactive_elements": False,
            "is_trivial": True,
            "error": None,
        }
        context = page = None
        try:
            context = await self._get_context()
            page = await context.new_page()
            page.set_default_navigation_timeout(settings.PLAYWRIGHT_NAVIGATION_TIMEOUT)
            page.set_default_timeout(settings.PLAYWRIGHT_PAGE_TIMEOUT)

            await page.route(
                "**/*",
                lambda route: (
                    route.abort()
                    if route.request.resource_type in ["image", "media", "font"]
                    else route.continue_()
                ),
            )

            response = await page.goto(url, wait_until="domcontentloaded")
            if response is None:
                result["error"] = "No response received"
                return result

            result["http_status"] = response.status
            result["is_live"] = response.status < 400
            if not result["is_live"]:
                return result

            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass

            result["page_title"] = await page.title()
            visible_text = await page.evaluate(
                "() => { const b = document.body; if (!b) return ''; return (b.innerText || '').slice(0, 2000); }"
            )
            result["visible_text"] = visible_text

            interactive_count = await page.evaluate(
                "() => document.querySelectorAll('button, a, input, select, textarea, [onclick]').length"
            )
            result["has_interactive_elements"] = interactive_count > 3

            screenshot_bytes = await page.screenshot(
                full_page=False, type="jpeg", quality=60
            )
            result["screenshot_base64"] = base64.b64encode(screenshot_bytes).decode(
                "utf-8"
            )

            trivial_indicators = [
                "coming soon",
                "hello world",
                "under construction",
                "lorem ipsum",
                "this is a test",
                "default page",
                "welcome to nginx",
                "apache2 ubuntu default page",
            ]
            text_lower = (visible_text or "").lower()
            title_lower = (result["page_title"] or "").lower()
            result["is_trivial"] = (
                not result["has_interactive_elements"] and len(visible_text or "") < 200
            ) or any(i in text_lower or i in title_lower for i in trivial_indicators)

        except asyncio.TimeoutError:
            result["error"] = "Timeout"
            result["is_live"] = False
        except Exception as e:
            result["error"] = str(e)[:200]
            logger.warning(f"Playwright error for {url}: {e}")
        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
            if context:
                try:
                    await context.close()
                except Exception:
                    pass

        return result


playwright_pool = PlaywrightPool()


async def check_url(url: str) -> dict:
    return await playwright_pool.check_url(url)


async def check_urls_batch(urls: list[str]) -> list[dict]:
    return await asyncio.gather(*[check_url(url) for url in urls])


def should_skip_url(url: str) -> bool:
    skip_domains = [
        "linkedin.com",
        "twitter.com",
        "x.com",
        "youtube.com",
        "medium.com",
        "dev.to",
        "npmjs.com",
        "pypi.org",
        "stackoverflow.com",
        "docs.",
        "documentation.",
    ]
    return any(d in url.lower() for d in skip_domains)


def is_deployment_url(url: str) -> bool:
    deployment_indicators = [
        "vercel.app",
        "netlify.app",
        "herokuapp.com",
        "railway.app",
        "render.com",
        "github.io",
        "pages.dev",
        "onrender.com",
        "fly.dev",
        "up.railway.app",
    ]
    url_lower = url.lower()
    if any(d in url_lower for d in ["github.com", "linkedin.com", "twitter.com"]):
        return False
    if any(d in url_lower for d in deployment_indicators):
        return True
    if url_lower.startswith("http") and "." in url_lower:
        parts = url_lower.replace("https://", "").replace("http://", "").split("/")
        domain = parts[0]
        if not any(d in domain for d in ["github", "linkedin", "twitter", "google"]):
            return True
    return False
