import pdfplumber
import re
from pathlib import Path
from utils.logger import get_logger

logger = get_logger(__name__)


def extract_urls_from_annotations(pdf_path: str) -> list[str]:
    urls = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                if page.annots:
                    for annot in page.annots:
                        uri = annot.get("uri")
                        if uri and uri.startswith("http") and uri not in urls:
                            urls.append(uri.rstrip(".,;:"))
    except Exception as e:
        logger.warning(f"Could not extract annotations: {e}")
    return urls


def extract_urls_from_text(text: str) -> list[str]:
    pattern = (
        r"https?://[^\s\)\]\>\,\"\']+"
        r"|(?:www\.|github\.com|linkedin\.com|vercel\.app|netlify\.app"
        r"|herokuapp\.com|railway\.app|render\.com)[^\s\)\]\>\,\"\']+"
    )
    urls = []
    for url in re.findall(pattern, text):
        url = url.rstrip(".,;:")
        if not url.startswith("http"):
            url = "https://" + url
        if url not in urls:
            urls.append(url)
    return urls


def extract_all_urls(text: str, pdf_path: str) -> list[str]:
    annotation_urls = extract_urls_from_annotations(pdf_path)
    text_urls = extract_urls_from_text(text)
    combined = annotation_urls.copy()
    for url in text_urls:
        if url not in combined:
            combined.append(url)
    return combined


def extract_github_url(urls: list[str]) -> tuple[str | None, str | None]:
    github_pattern = r"github\.com/([a-zA-Z0-9\-]+)"
    for url in urls:
        match = re.search(github_pattern, url)
        if match:
            username = match.group(1)
            if username.lower() not in (
                "sponsors",
                "orgs",
                "apps",
                "marketplace",
                "features",
                "pricing",
                "about",
            ):
                return url, username
    return None, None


def extract_linkedin_url(urls: list[str]) -> str | None:
    for url in urls:
        if "linkedin.com/in/" in url:
            return url
    return None


def extract_email(text: str) -> str | None:
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else None


def extract_phone(text: str) -> str | None:
    match = re.search(r"(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})", text)
    return match.group(0).strip() if match else None


def parse_resume_mechanical(file_path: str, resume_index: int) -> dict:
    path = Path(file_path)
    file_name = path.name

    try:
        with pdfplumber.open(file_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"

        if not full_text.strip():
            logger.warning(f"Empty text extracted from {file_name}")
            return {
                "resume_index": resume_index,
                "file_name": file_name,
                "raw_text": "",
                "email": None,
                "phone": None,
                "github_url": None,
                "github_username": None,
                "linkedin_url": None,
                "all_urls": [],
            }

        all_urls = extract_all_urls(full_text, file_path)
        github_url, github_username = extract_github_url(all_urls)
        linkedin_url = extract_linkedin_url(all_urls)

        return {
            "resume_index": resume_index,
            "file_name": file_name,
            "raw_text": full_text,
            "email": extract_email(full_text),
            "phone": extract_phone(full_text),
            "github_url": github_url,
            "github_username": github_username,
            "linkedin_url": linkedin_url,
            "all_urls": all_urls,
        }

    except Exception as e:
        logger.error(f"Failed to parse {file_name}: {e}")
        return {
            "resume_index": resume_index,
            "file_name": file_name,
            "raw_text": "",
            "email": None,
            "phone": None,
            "github_url": None,
            "github_username": None,
            "linkedin_url": None,
            "all_urls": [],
        }
