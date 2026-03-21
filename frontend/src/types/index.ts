export interface Skill {
  name: string;
  status: "confirmed" | "unverified" | "flagged";
  detail: string;
}

export interface Deployment {
  url: string;
  status: "live" | "dead";
  desc: string;
}

export interface Repo {
  name: string;
  lang: string;
  stars: number;
  desc: string;
  complexity: string;
}

export interface GitHubInfo {
  username: string;
  repos: number;
  commits6mo: number;
  activity: string;
  topRepos: Repo[];
}

export interface Insight {
  icon: string;
  label: string;
  text: string;
}

export interface Candidate {
  id: number;
  rank: number;
  name: string;
  school: string;
  gpa: string;
  score: number;
  github: GitHubInfo;
  skills: Skill[];
  deployments: Deployment[];
  commitStyle: string;
  insights: Insight[];
  experience: string;
}

export interface EliminatedCandidate {
  name: string;
  reason: string;
  phase: number;
}

export interface JD {
  title: string;
  company: string;
}
