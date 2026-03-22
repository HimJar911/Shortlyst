/**
 * transformers.ts — the only place that converts raw backend shapes into
 * the frontend Candidate/EliminatedCandidate/JD types consumed by the render layer.
 *
 * Input:  AnalysisResult  (api.ts — snake_case, mirrors Pydantic models exactly)
 * Output: TransformedResults  { candidates, eliminated, jd }
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
  ApiVerifiedSkill,
  ApiDeployedUrl,
} from "./api";

// ─── Sub-type mappers ─────────────────────────────────────────────────────────

function complexityLabel(level: string | undefined): string {
  if (!level) return "Low";
  switch (level) {
    case "trivial":
    case "basic":
      return "Low";
    case "intermediate":
      return "Medium";
    case "advanced":
      return "High";
    default:
      return "Low";
  }
}

function normalizeActivity(raw: string | null): string {
  if (!raw) return "Unknown";
  const l = raw.toLowerCase();
  if (l.includes("consistent") || l.includes("active") || l.includes("regular")) return "Active";
  if (l.includes("sparse") || l.includes("irregular") || l.includes("occasional")) return "Sparse";
  if (l.includes("inactive") || l.includes("none")) return "Inactive";
  return raw;
}

function mapSkill(skill: any): Skill {
  return {
    name: skill.skill ?? skill.name ?? "Unknown",
    status: skill.status ?? "unverified",
    detail: skill.evidence ?? "",
  };
}

function mapDeployment(d: ApiDeployedUrl): Deployment {
  return {
    url: d.url,
    status: d.is_live ? "live" : "dead",
    desc: d.assessment ?? (d.is_real_app ? "Real deployed application" : "Deployment URL"),
  };
}

function mapGitHub(signal: ApiGitHubSignal): GitHubInfo {
  // MISMATCH FIX: backend uses repo_analyses[] not repos[] for detailed repo data
  const repoAnalyses: any[] = (signal as any).repo_analyses ?? signal.repos ?? [];

  const topRepos: Repo[] = repoAnalyses
    .filter((r: any) => !r.is_tutorial_clone && !r.is_fork)
    .slice(0, 3)
    .map((r: any): Repo => ({
      name: r.name ?? "Unknown",
      lang: r.language ?? "Unknown",
      stars: r.stars ?? 0,
      // repo_analyses have assessment nested inside
      desc: r.assessment?.problem_summary
        ?? r.assessment?.summary
        ?? r.description
        ?? r.readme_summary
        ?? "",
      complexity: complexityLabel(
        r.assessment?.overall_complexity ?? r.complexity
      ),
    }));

  // commit count — parse from commit_quality.assessment string
  const sig = signal as any;
  const commitCount = sig?.commit_quality?.assessment
    ? parseInt(sig.commit_quality.assessment.match(/[0-9]+/)?.[0] ?? "0")
    : 0;

  return {
    username: signal.username ?? "unknown",
    repos: signal.total_public_repos,
    commits6mo: commitCount,
    activity: normalizeActivity(signal.contribution_consistency),
    topRepos,
  };
}

function buildInsights(ranked: ApiRankedCandidate): Insight[] {
  const { candidate, recommendation } = ranked;
  const signal = candidate.github_signal as any;

  // MISMATCH FIX: overall_code_quality is a string, not code_quality.summary
  const codeQualityText: string =
    signal?.code_quality?.summary ??
    (signal?.overall_code_quality
      ? `Overall code quality: ${signal.overall_code_quality}`
      : "No code quality data available.");

  const requiredV: any[] = (candidate as any).required_verdicts ?? [];
  const anyOfV: any[] = (candidate as any).any_of_verdicts ?? [];
  const anyOfSatisfied: boolean = (candidate as any).any_of_satisfied ?? false;

  const confirmedRequired = requiredV.filter((s: any) => s.status === "confirmed").length;
  const totalSlots = requiredV.length + (anyOfV.length > 0 ? 1 : 0);
  const confirmedSlots = confirmedRequired + (anyOfSatisfied ? 1 : 0);

  const jdText: string =
    (candidate as any).jd_match_reasoning ??
    (totalSlots > 0
      ? `${confirmedSlots}/${totalSlots} JD requirements verified.`
      : "No JD skill verification data.");

  // MISMATCH FIX: commit_quality_score lives at signal.commit_quality.score
  const commitScore =
    signal?.commit_quality?.score ??
    signal?.commit_quality_score ??
    0;
  const consistency = signal?.contribution_consistency;
  const commitText: string = consistency
    ? `${consistency}. Commit quality: ${commitScore}/1.0`
    : `Commit quality score: ${commitScore}`;

  const overallText: string =
    (ranked as any).rank_reasoning ??
    (candidate as any).rank_reasoning ??
    recommendation ??
    "No ranking reasoning available.";

  return [
    { icon: "code", label: "Code Quality", text: codeQualityText },
    { icon: "target", label: "JD Alignment", text: jdText },
    { icon: "git", label: "Commit Pattern", text: commitText },
    { icon: "signal", label: "Overall Signal", text: overallText },
  ];
}

function deriveCommitStyle(signal: ApiGitHubSignal): string {
  const s = signal as any;

  // Try repo_analyses first (new backend shape)
  const repoAnalyses: any[] = s.repo_analyses ?? signal.repos ?? [];
  const messages = repoAnalyses
    .flatMap((r: any) => r.commit_messages ?? [])
    .filter(Boolean)
    .slice(0, 3);

  if (messages.length > 0) {
    return `Examples: ${messages.map((m: string) => `'${m}'`).join(", ")}`;
  }

  // Fallback to commit_quality assessment
  const commitAssessment = s.commit_quality?.assessment;
  if (commitAssessment) return commitAssessment;

  return s.code_quality?.summary ?? "No commit history available.";
}

function mapRankedCandidate(ranked: ApiRankedCandidate): Candidate {
  const { rank, candidate, overall_score } = ranked;

  // Safety guard
  if (!candidate) {
    return {
      id: 0, rank, name: "Unknown", school: "", gpa: "", experience: "",
      score: Math.round((overall_score ?? 5) * 10),
      github: { username: "", repos: 0, commits6mo: 0, activity: "Unknown", topRepos: [] },
      skills: [], deployments: [], commitStyle: "", insights: [],
    };
  }

  const signal = candidate.github_signal as any;

  // MISMATCH FIX: deployment_signal.deployments[] not deployed_urls[]
  const deploymentSignal = (candidate as any).deployment_signal;
  const deployments: Deployment[] = deploymentSignal?.deployments
    ? deploymentSignal.deployments
      .filter((d: any) => !d.skipped)
      .map((d: any): Deployment => ({
        url: d.url,
        status: d.is_live ? "live" : "dead",
        desc: d.vision?.assessment ?? d.assessment ?? "",
      }))
    : (candidate as any).deployed_urls
      ? ((candidate as any).deployed_urls as ApiDeployedUrl[]).map(mapDeployment)
      : [];

  // MISMATCH FIX: overall_score is 0–10, display as 0–100
  const displayScore = Math.round((overall_score ?? 5) * 10);

  // Education and experience from phase2 propagation
  const education = (candidate as any).education ?? [];
  const school = education[0]?.institution ?? "";
  const experienceYears = (candidate as any).experience_years;
  const experience = experienceYears != null ? `${experienceYears} years` : "";

  return {
    id: candidate.resume_index,
    rank,
    name: candidate.name ?? candidate.file_name.replace(/\.pdf$/i, ""),
    school,
    gpa: "",       // not extracted by backend
    experience,
    score: displayScore,
    github: mapGitHub(signal ?? {}),
    // Only show JD skills — required + any_of group
    // If structured verdicts exist use them, otherwise fall back to flat list
    skills: (() => {
      const requiredV: any[] = (candidate as any).required_verdicts ?? [];
      const anyOfV: any[] = (candidate as any).any_of_verdicts ?? [];
      const anyOfSatisfied: boolean = (candidate as any).any_of_satisfied ?? false;

      if (requiredV.length > 0 || anyOfV.length > 0) {
        // Required skills — each is its own slot
        const requiredSkills: Skill[] = requiredV.map(mapSkill);

        // Any-of group — show all options but only confirmed one(s) are black
        // They all share the same slot in the counter
        const anyOfSkills: Skill[] = anyOfV.map((v: any) => ({
          ...mapSkill(v),
          // Mark non-confirmed any-of skills as unverified even if they were confirmed
          // so the UI shows only the matched one as black
          status: v.status === "confirmed" ? "confirmed" : "unverified",
          isAnyOf: true,
        } as any));

        return [...requiredSkills, ...anyOfSkills];
      }

      // Fallback — flat verified_skills list
      return (candidate.verified_skills ?? []).map(mapSkill);
    })(),
    deployments,
    commitStyle: deriveCommitStyle(signal ?? {}),
    insights: buildInsights(ranked),
  };
}

function deriveJD(result: AnalysisResult): JD {
  const jdReq = result.jd_requirements;
  if (!jdReq) return { title: "Unknown Role", company: "" };

  const firstLine = (jdReq.raw_jd ?? "").split("\n").find((l) => l.trim().length > 0) ?? "";
  const title =
    (jdReq as any).role_title?.trim() ||
    (jdReq.role_level ? `${jdReq.role_level} Engineer` : null) ||
    firstLine.slice(0, 60) ||
    "Unknown Role";

  const companyMatch =
    /(?:^|\bat\b|@|for\b|company[:\s]+)\s*([A-Z][A-Za-z0-9 &.,'-]{1,40})/i.exec(jdReq.raw_jd ?? "");
  const company = companyMatch?.[1]?.trim() ?? "";

  return { title, company };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TransformedResults {
  candidates: Candidate[];
  eliminated: EliminatedCandidate[];
  jd: JD;
}

export function transformResults(result: AnalysisResult): TransformedResults {
  return {
    // Safety: guard against undefined arrays if pipeline errored mid-way
    candidates: (result.ranked_candidates ?? []).map(mapRankedCandidate),
    eliminated: (result.eliminated_candidates ?? []).map((e) => ({
      name: e.name ?? (e.file_name ?? "").replace(/\.pdf$/i, ""),
      reason: e.reason,
      phase: e.eliminated_in_phase,
    })),
    jd: deriveJD(result),
  };
}