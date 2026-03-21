import pdfplumber
import re
from pathlib import Path
from typing import Optional
from models.candidate import CandidateRaw, Education, Project
from utils.logger import get_logger

logger = get_logger(__name__)


def extract_github_username(url: str) -> Optional[str]:
    patterns = [
        r"github\.com/([a-zA-Z0-9\-]+)/?$",
        r"github\.com/([a-zA-Z0-9\-]+)/",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            username = match.group(1)
            if username.lower() not in ("sponsors", "orgs", "apps", "marketplace"):
                return username
    return None


def extract_all_urls(text: str) -> list[str]:
    pattern = r"https?://[^\s\)\]\>\,\"\']+|(?:www\.|github\.com|linkedin\.com)[^\s\)\]\>\,\"\']*"
    urls = re.findall(pattern, text)
    cleaned = []
    for url in urls:
        url = url.rstrip(".,;:")
        if not url.startswith("http"):
            url = "https://" + url
        if url not in cleaned:
            cleaned.append(url)
    return cleaned


def extract_github_url(urls: list[str]) -> Optional[str]:
    for url in urls:
        if "github.com/" in url:
            username = extract_github_username(url)
            if username:
                return url
    return None


def extract_linkedin_url(urls: list[str]) -> Optional[str]:
    for url in urls:
        if "linkedin.com/in/" in url:
            return url
    return None


def extract_email(text: str) -> Optional[str]:
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    match = re.search(pattern, text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    pattern = r"(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})"
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None


def extract_name(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:5]:
        if (
            len(line.split()) in (2, 3)
            and not any(c in line for c in ["@", "http", "/", "|", ".com"])
            and not any(
                kw in line.lower()
                for kw in ["resume", "cv", "curriculum", "vitae", "summary"]
            )
        ):
            return line
    return None


def extract_experience_years(text: str) -> float:
    patterns = [
        r"(\d+)\+?\s*years?\s*of\s*(?:professional\s*)?experience",
        r"(\d+)\+?\s*years?\s*(?:of\s*)?(?:industry|work|software|engineering)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))

    year_pattern = r"\b(20\d{2})\b"
    years_found = re.findall(year_pattern, text)
    if len(years_found) >= 2:
        years = [int(y) for y in years_found]
        span = max(years) - min(years)
        if 1 <= span <= 30:
            return float(span)

    return 0.0


def extract_skills(text: str) -> list[str]:
    skill_keywords = [
        "python",
        "javascript",
        "typescript",
        "java",
        "c++",
        "c#",
        "go",
        "rust",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "scala",
        "r",
        "matlab",
        "react",
        "next.js",
        "nextjs",
        "vue",
        "angular",
        "svelte",
        "node.js",
        "nodejs",
        "express",
        "fastapi",
        "django",
        "flask",
        "spring",
        "rails",
        "laravel",
        "aws",
        "gcp",
        "azure",
        "docker",
        "kubernetes",
        "terraform",
        "ansible",
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "sqlite",
        "graphql",
        "rest",
        "grpc",
        "kafka",
        "rabbitmq",
        "celery",
        "git",
        "github",
        "gitlab",
        "ci/cd",
        "jenkins",
        "github actions",
        "machine learning",
        "deep learning",
        "tensorflow",
        "pytorch",
        "scikit-learn",
        "pandas",
        "numpy",
        "spark",
        "hadoop",
        "linux",
        "bash",
        "powershell",
        "tailwind",
        "css",
        "html",
        "sass",
        "figma",
        "jira",
        "agile",
        "scrum",
    ]
    text_lower = text.lower()
    found = []
    for skill in skill_keywords:
        if skill in text_lower and skill not in found:
            found.append(skill)
    return found


def extract_education(text: str) -> list[Education]:
    education = []
    degree_patterns = [
        r"(bachelor|b\.s\.|b\.e\.|b\.tech|b\.sc|bs|be)[\s\.,]",
        r"(master|m\.s\.|m\.e\.|m\.tech|m\.sc|ms|me|mba)[\s\.,]",
        r"(ph\.?d|doctorate)[\s\.,]",
        r"(associate|a\.s\.|a\.a\.)[\s\.,]",
    ]
    degree_map = {
        "bachelor": "Bachelor's",
        "b.s.": "Bachelor's",
        "b.e.": "Bachelor's",
        "b.tech": "Bachelor's",
        "b.sc": "Bachelor's",
        "bs": "Bachelor's",
        "be": "Bachelor's",
        "master": "Master's",
        "m.s.": "Master's",
        "m.e.": "Master's",
        "m.tech": "Master's",
        "m.sc": "Master's",
        "ms": "Master's",
        "me": "Master's",
        "mba": "MBA",
        "ph.d": "PhD",
        "phd": "PhD",
        "doctorate": "PhD",
        "associate": "Associate's",
        "a.s.": "Associate's",
        "a.a.": "Associate's",
    }
    text_lower = text.lower()
    for pattern in degree_patterns:
        matches = re.finditer(pattern, text_lower)
        for match in matches:
            degree_key = match.group(1).lower().rstrip(" .,")
            degree = degree_map.get(degree_key, match.group(1).title())
            year_match = re.search(
                r"\b(20\d{2}|19\d{2})\b", text[match.start() : match.start() + 200]
            )
            grad_year = int(year_match.group(1)) if year_match else None
            education.append(Education(degree=degree, graduation_year=grad_year))
            break

    return education[:2]


def extract_projects(text: str, all_urls: list[str]) -> list[Project]:
    projects = []
    project_section_pattern = r"(?:projects?|portfolio|work)[\s\S]{0,2000}"
    match = re.search(project_section_pattern, text, re.IGNORECASE)
    if not match:
        return projects

    section = match.group(0)
    lines = [l.strip() for l in section.split("\n") if l.strip()]

    for i, line in enumerate(lines[:20]):
        if (
            len(line) < 60
            and not line.startswith("•")
            and not line.startswith("-")
            and len(line.split()) >= 2
        ):
            description = lines[i + 1] if i + 1 < len(lines) else None
            project_urls = [
                u
                for u in all_urls
                if any(
                    word.lower() in u.lower()
                    for word in line.split()[:3]
                    if len(word) > 3
                )
            ]
            projects.append(
                Project(
                    name=line,
                    description=description,
                    urls=project_urls[:2],
                )
            )

    return projects[:5]


def parse_resume(file_path: str, resume_index: int) -> CandidateRaw:
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
            return CandidateRaw(
                resume_index=resume_index,
                file_name=file_name,
                raw_text="",
            )

        all_urls = extract_all_urls(full_text)
        github_url = extract_github_url(all_urls)
        github_username = extract_github_username(github_url) if github_url else None

        return CandidateRaw(
            resume_index=resume_index,
            file_name=file_name,
            name=extract_name(full_text),
            email=extract_email(full_text),
            phone=extract_phone(full_text),
            github_url=github_url,
            github_username=github_username,
            linkedin_url=extract_linkedin_url(all_urls),
            all_urls=all_urls,
            claimed_skills=extract_skills(full_text),
            experience_years=extract_experience_years(full_text),
            education=extract_education(full_text),
            projects=extract_projects(full_text, all_urls),
            raw_text=full_text,
        )

    except Exception as e:
        logger.error(f"Failed to parse {file_name}: {e}")
        return CandidateRaw(
            resume_index=resume_index,
            file_name=file_name,
            raw_text="",
        )
