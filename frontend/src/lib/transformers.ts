/**
 * transformers.ts — the only place that converts raw backend shapes into
 * the frontend Candidate/EliminatedCandidate/JD types consumed by the render layer.
 *
 * Input:  AnalysisResult  (api.ts — snake_case, mirrors Pydantic models exactly)
 * Output: TransformedResults  { candidates, eliminated, jd }
 *
 * See bottom of file for a summary of schema mismatches that had to be normalised.
 */

import type {
  Candidate,
  EliminatedCandidate,
  GitHubInfo,
  Insight,
  JD,
  Repo,
  Skill,
  Deployment,
} from "@/types";
import type {
  AnalysisResult,
  ApiRankedCandidate,
  ApiGitHubSignal,
  ApiRepoData,
  ApiVerifiedSkill,
  ApiDeployedUrl,
  ComplexityLevel,
} from "./api";

// ─── Sub-type mappers ─────────────────────────────────────────────────────────

function complexityLabel(level: ComplexityLevel): string {
  switch (level) {
    case "trivial":
    case "basic":
      return "Low";
    case "intermediate":
      return "Medium";
    case "advanced":
      return "High";
  }
}

/**
 * Normalise the backend's free-text contribution_consistency into the three
 * activity labels the UI knows about.
 */
function normalizeActivity(raw: string | null): string {
  if (!raw) return "Unknown";
  const l = raw.toLowerCase();
  if (l.includes("consistent") || l.includes("active") || l.includes("regular")) return "Active";
  if (l.includes("sparse") || l.includes("irregular") || l.includes("occasional")) return "Sparse";
  if (l.includes("inactive") || l.includes("none")) return "Inactive";
  // Passthrough — backend may already send a display-ready string.
  return raw;
}

function mapRepo(repo: ApiRepoData): Repo {
  return {
    name: repo.name,
    lang: repo.language ?? "Unknown",
    stars: repo.stars,
    desc: repo.description ?? repo.readme_summary ?? "",
    complexity: complexityLabel(repo.complexity),
  };
}

function mapSkill(skill: ApiVerifiedSkill): Skill {
  return {
    name: skill.name,
    status: skill.status,         // SkillStatus union is identical on both sides
    detail: skill.evidence,       // evidence → detail
  };
}

function mapDeployment(d: ApiDeployedUrl): Deployment {
  return {
    url: d.url,
    status: d.is_live ? "live" : "dead",   // is_live bool → "live" | "dead"
    desc: d.assessment ?? "",
  };
}

function mapGitHub(signal: ApiGitHubSignal): GitHubInfo {
  // Sort by stars, skip tutorial clones, keep top 3.
  const topRepos: Repo[] = signal.repos
    .filter((r) => !r.is_tutorial_clone)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3)
    .map(mapRepo);

  return {
    username: signal.username ?? "unknown",
    repos: signal.total_public_repos,
    // MISMATCH: no 6-month commit count in backend schema — defaulted to 0.
    commits6mo: 0,
    activity: normalizeActivity(signal.contribution_consistency),
    topRepos,
  };
}

/**
 * Build the four insight cards from backend reasoning fields.
 * Each card maps to one analytical dimension the UI already renders.
 */
function buildInsights(ranked: ApiRankedCandidate): Insight[] {
  const { candidate, recommendation } = ranked;
  const cq = candidate.github_signal.code_quality;
  const confirmedCount = candidate.verified_skills.filter((s) => s.status === "confirmed").length;
  const totalSkills = candidate.verified_skills.length;

  const codeQualityText: string =
    cq?.summary ??
    (cq
      ? `${cq.overall} quality — ${cq.has_error_handling ? "has error handling" : "no error handling found"}.`
      : "No code quality data available.");

  const jdText: string =
    candidate.jd_match_reasoning ??
    (totalSkills > 0
      ? `${confirmedCount}/${totalSkills} skills confirmed. JD match score: ${Math.round(candidate.jd_match_score)}.`
      : `JD match score: ${Math.round(candidate.jd_match_score)}.`);

  const consistency = candidate.github_signal.contribution_consistency;
  const commitScore = candidate.github_signal.commit_quality_score;
  const commitText: string = consistency
    ? `${consistency}. Commit quality score: ${commitScore}/10.`
    : `Commit quality score: ${commitScore}/10.`;

  const overallText: string = candidate.rank_reasoning ?? recommendation;

  return [
    { icon: "code",   label: "Code Quality",   text: codeQualityText },
    { icon: "target", label: "JD Alignment",   text: jdText },
    { icon: "git",    label: "Commit Pattern", text: commitText },
    { icon: "signal", label: "Overall Signal", text: overallText },
  ];
}

/**
 * Derive a commit-style narrative from sampled commit messages stored on repos.
 * Falls back to the code_quality summary if no messages are present.
 */
function deriveCommitStyle(signal: ApiGitHubSignal): string {
  const messages = signal.repos
    .flatMap((r) => r.commit_messages)
    .filter(Boolean)
    .slice(0, 3);

  if (messages.length > 0) {
    return `Examples: ${messages.map((m) => `'${m}'`).join(", ")}`;
  }
  return signal.code_quality?.summary ?? "No commit history available.";
}

function mapRankedCandidate(ranked: ApiRankedCandidate): Candidate {
  const { rank, candidate, overall_score } = ranked;

  return {
    id: candidate.resume_index,
    rank,
    name: candidate.name ?? candidate.file_name.replace(/\.pdf$/i, ""),
    // MISMATCH: school, gpa, experience are not in the backend schema.
    // The resume parser does not surface structured education / years fields.
    // Defaulting to empty strings so the render layer can guard with || "—".
    school: "",
    gpa: "",
    experience: "",
    score: Math.round(overall_score),
    github: mapGitHub(candidate.github_signal),
    skills: candidate.verified_skills.map(mapSkill),
    deployments: candidate.deployed_urls.map(mapDeployment),
    commitStyle: deriveCommitStyle(candidate.github_signal),
    insights: buildInsights(ranked),
  };
}

/**
 * Derive a JD display object from jd_requirements.
 *
 * Title priority:
 *   1. role_title  — exact title extracted by the LLM from the JD text
 *                    (present in the raw dict stored by phase3, not in the Pydantic model)
 *   2. role_level  — e.g. "senior" → "Senior Engineer" (fallback)
 *   3. first non-empty line of raw_jd (last resort)
 *
 * Company: not in the backend schema — attempted via a naive regex on raw_jd.
 */
function deriveJD(result: AnalysisResult): JD {
  const jdReq = result.jd_requirements;
  if (!jdReq) return { title: "Unknown Role", company: "" };

  const firstLine = jdReq.raw_jd.split("\n").find((l) => l.trim().length > 0) ?? "";
  const title =
    jdReq.role_title?.trim() ||
    (jdReq.role_level ? `${jdReq.role_level} Engineer` : null) ||
    firstLine.slice(0, 60) ||
    "Unknown Role";

  // Naive company extraction — looks for "at <Company>", "@ <Company>", or "Company: X".
  const companyMatch =
    /(?:^|\bat\b|@|for\b|company[:\s]+)\s*([A-Z][A-Za-z0-9 &.,'-]{1,40})/i.exec(jdReq.raw_jd);
  const company = companyMatch?.[1]?.trim() ?? "";

  return { title, company };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TransformedResults {
  candidates: Candidate[];
  eliminated: EliminatedCandidate[];
  jd: JD;
}

/**
 * Transform a raw AnalysisResult from the backend into the shapes the
 * frontend render layer consumes.
 *
 * This is a pure function — no side effects, no imports of React or stores.
 */
export function transformResults(result: AnalysisResult): TransformedResults {
  return {
    candidates: result.ranked_candidates.map(mapRankedCandidate),
    eliminated: result.eliminated_candidates.map((e) => ({
      name: e.name ?? e.file_name.replace(/\.pdf$/i, ""),
      reason: e.reason,
      phase: e.eliminated_in_phase,   // eliminated_in_phase → phase
    })),
    jd: deriveJD(result),
  };
}

/*
 * ─── Schema mismatch log ───────────────────────────────────────────────────────
 *
 * Field                     Backend source           Frontend target    Resolution
 * ─────────────────────────────────────────────────────────────────────────────────
 * github_signal (object)    ApiGitHubSignal          GitHubInfo         mapped (mapGitHub)
 * overall_score (float)     ApiRankedCandidate       Candidate.score    Math.round()
 * verified_skills[].evidence ApiVerifiedSkill        Skill.detail       renamed
 * deployed_urls[].is_live   ApiDeployedUrl (bool)    Deployment.status  bool → "live"|"dead"
 * deployed_urls[].assessment ApiDeployedUrl          Deployment.desc    ?? ""
 * repos[].language          ApiRepoData (null)       Repo.lang          ?? "Unknown"
 * repos[].description       ApiRepoData (null)       Repo.desc          ?? readme_summary ?? ""
 * repos[].complexity        ComplexityLevel (4-val)  Repo.complexity    remapped to Low/Med/High
 * eliminated_in_phase       ApiEliminatedCandidate   EliminatedCandidate.phase  renamed
 * contribution_consistency  free-text string         GitHubInfo.activity  normalizeActivity()
 * jd_match_reasoning        string | null            Insight[1].text    ?? derived fallback
 * rank_reasoning            string | null            Insight[3].text    ?? recommendation
 * commit_messages[]         per-repo array           commitStyle string  sampled + joined
 *
 * Gaps (fields absent from backend, defaulted on frontend):
 *   Candidate.commits6mo   — no 6-month count in API, defaults to 0
 *   Candidate.school       — not surfaced by resume parser, defaults to ""
 *   Candidate.gpa          — not surfaced by resume parser, defaults to ""
 *   Candidate.experience   — not surfaced by resume parser, defaults to ""
 *   JD.title               — now uses role_title (injected by LLM extraction dict into phase3 result);
 *                           falls back to role_level heuristic then raw_jd first line
 *   JD.company             — regex-extracted from raw_jd, "" on failure
 */
