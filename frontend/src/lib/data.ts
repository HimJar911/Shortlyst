import type { Candidate, EliminatedCandidate, JD } from "@/types";

export const MOCK_JD: JD = {
  title: "Senior Full-Stack Engineer",
  company: "Lattice Technologies",
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 1, rank: 1, name: "Marcus Chen", school: "Arizona State University", gpa: "3.3",
    score: 94,
    github: { username: "mchen-dev", repos: 23, commits6mo: 347, activity: "Active", topRepos: [
      { name: "supply-chain-optimizer", lang: "TypeScript", stars: 12, desc: "Real-time supply chain optimization dashboard with live data feeds", complexity: "High" },
      { name: "auth-microservice", lang: "Node.js", stars: 8, desc: "JWT-based auth service with refresh token rotation", complexity: "High" },
      { name: "react-data-grid", lang: "React", stars: 34, desc: "Performant virtual-scrolling data grid component", complexity: "Medium" },
    ]},
    skills: [
      { name: "React", status: "confirmed", detail: "Confirmed across 7 repos including a live e-commerce app with cart and checkout" },
      { name: "Node.js", status: "confirmed", detail: "Confirmed — auth microservice, REST APIs, WebSocket server" },
      { name: "TypeScript", status: "confirmed", detail: "Primary language in 15 of 23 repos" },
      { name: "AWS", status: "confirmed", detail: "Deployment configs found — EC2, S3, Lambda references in 3 repos" },
      { name: "PostgreSQL", status: "confirmed", detail: "Schema files and migration scripts in 4 repos" },
      { name: "GraphQL", status: "confirmed", detail: "Apollo Server implementation found in 2 repos" },
      { name: "Docker", status: "confirmed", detail: "Dockerfiles and docker-compose in 6 repos" },
    ],
    deployments: [
      { url: "supplychain-app.vercel.app", status: "live", desc: "Fully functional dashboard with real-time charts, filters, and export" },
      { url: "mchen-auth-demo.fly.dev", status: "live", desc: "Working auth flow with login, registration, and token refresh" },
      { url: "react-datagrid.netlify.app", status: "live", desc: "Interactive demo with 10k row rendering, sorting, filtering" },
    ],
    commitStyle: "Descriptive and consistent — 'implement JWT refresh token rotation with Redis store', 'add virtual scroll to data grid for 10k+ rows'",
    insights: [
      { icon: "code", label: "Code Quality", text: "Production-grade — modular architecture, error handling, and tests across repos." },
      { icon: "target", label: "JD Alignment", text: "7/7 skills confirmed with working code. Near-perfect match for this role." },
      { icon: "git", label: "Commit Pattern", text: "347 commits in 6mo, descriptive messages, consistent weekly cadence." },
      { icon: "signal", label: "Overall Signal", text: "Strongest verified profile in the pool. The resume undersells him — the code doesn't." },
    ],
    experience: "4 years",
  },
  {
    id: 2, rank: 2, name: "Priya Sharma", school: "University of Texas, Austin", gpa: "3.5",
    score: 88,
    github: { username: "priya-builds", repos: 18, commits6mo: 256, activity: "Active", topRepos: [
      { name: "task-flow", lang: "React/TypeScript", stars: 45, desc: "Kanban-style project management app", complexity: "High" },
      { name: "node-api-starter", lang: "Node.js", stars: 22, desc: "Production-ready REST API boilerplate", complexity: "Medium" },
    ]},
    skills: [
      { name: "React", status: "confirmed", detail: "Confirmed across 5 repos, including production Kanban app" },
      { name: "Node.js", status: "confirmed", detail: "Confirmed — API starter kit with 22 GitHub stars" },
      { name: "TypeScript", status: "confirmed", detail: "Used in 12 of 18 repos" },
      { name: "AWS", status: "unverified", detail: "Claimed on resume — no evidence found in repos or deployments" },
      { name: "PostgreSQL", status: "confirmed", detail: "Prisma ORM with PostgreSQL in task-flow app" },
    ],
    deployments: [
      { url: "taskflow.vercel.app", status: "live", desc: "Full Kanban board with drag-drop, real-time updates, team features" },
      { url: "priya-portfolio.com", status: "live", desc: "Clean portfolio site with project showcases" },
    ],
    commitStyle: "Clear and purposeful — 'add drag-and-drop reorder for kanban columns', 'implement real-time board sync with WebSockets'",
    insights: [
      { icon: "code", label: "Code Quality", text: "Clean abstractions and solid component design. Tests exist but aren't comprehensive." },
      { icon: "target", label: "JD Alignment", text: "4/5 confirmed. AWS is the gap — claimed but zero evidence anywhere." },
      { icon: "git", label: "Commit Pattern", text: "256 commits in 6mo, feature-scoped messages, consistent rhythm." },
      { icon: "signal", label: "Overall Signal", text: "High-signal candidate with a standout 45-star project. Probe the AWS claim in interview." },
    ],
    experience: "3 years",
  },
  {
    id: 3, rank: 3, name: "James O'Brien", school: "Self-taught", gpa: "N/A",
    score: 82,
    github: { username: "jobrien-code", repos: 31, commits6mo: 189, activity: "Active", topRepos: [
      { name: "budget-tracker", lang: "React", stars: 5, desc: "Personal finance tracker with charts and CSV export", complexity: "Medium" },
      { name: "express-api-template", lang: "Node.js", stars: 3, desc: "Express.js REST API with auth middleware", complexity: "Medium" },
    ]},
    skills: [
      { name: "React", status: "confirmed", detail: "Confirmed across 8 repos" },
      { name: "Node.js", status: "confirmed", detail: "Confirmed in 6 repos" },
      { name: "TypeScript", status: "confirmed", detail: "Used in recent repos" },
      { name: "AWS", status: "confirmed", detail: "S3 and Lambda configs in 2 repos" },
      { name: "PostgreSQL", status: "unverified", detail: "Claimed — only SQLite found in repos" },
    ],
    deployments: [
      { url: "mybudget-app.netlify.app", status: "live", desc: "Working budget tracker with chart visualizations" },
      { url: "jobrien.dev", status: "dead", desc: "Portfolio link returns 404" },
    ],
    commitStyle: "Mixed — some descriptive, some generic ('fix bug', 'update')",
    insights: [
      { icon: "code", label: "Code Quality", text: "Functional but uneven — inconsistent patterns, no tests. Self-taught origin shows." },
      { icon: "target", label: "JD Alignment", text: "4/5 confirmed. PostgreSQL unverified — only SQLite found despite the claim." },
      { icon: "git", label: "Commit Pattern", text: "189 commits in 6mo, mix of descriptive and lazy messages. Ships fast, low discipline." },
      { icon: "signal", label: "Overall Signal", text: "Genuine builder with 31 repos and a live app. Ships but doesn't maintain. Growth potential." },
    ],
    experience: "3 years",
  },
  {
    id: 4, rank: 4, name: "Sarah Kim", school: "Georgia Tech", gpa: "3.7",
    score: 71,
    github: { username: "skim-gt", repos: 9, commits6mo: 67, activity: "Sparse", topRepos: [
      { name: "gt-capstone", lang: "Python/React", stars: 1, desc: "University capstone project — course scheduler", complexity: "Medium" },
    ]},
    skills: [
      { name: "React", status: "confirmed", detail: "Found in 3 repos — mostly course projects" },
      { name: "Node.js", status: "unverified", detail: "Claimed — no Node.js repos found, only Python backends" },
      { name: "TypeScript", status: "unverified", detail: "Claimed — all React code is plain JavaScript" },
      { name: "AWS", status: "unverified", detail: "Claimed — zero evidence found" },
      { name: "PostgreSQL", status: "confirmed", detail: "Used in capstone project" },
    ],
    deployments: [
      { url: "skim-portfolio.github.io", status: "live", desc: "GitHub Pages portfolio — static site, no interactive projects" },
    ],
    commitStyle: "Sparse — 'hw3 submission', 'final project update', 'fix'",
    insights: [
      { icon: "code", label: "Code Quality", text: "Reads like graded coursework — functional but no defensive coding or edge-case handling." },
      { icon: "target", label: "JD Alignment", text: "Only 2/5 confirmed. Node.js, TypeScript, AWS all claimed with zero evidence." },
      { icon: "git", label: "Commit Pattern", text: "67 commits in 6mo. Messages like 'hw3 submission' — academic-only activity." },
      { icon: "signal", label: "Overall Signal", text: "Strong GPA, weak verified profile. Resume significantly overstates the actual skill set." },
    ],
    experience: "2 years",
  },
  {
    id: 5, rank: 5, name: "David Park", school: "Stanford University", gpa: "3.8",
    score: 58,
    github: { username: "dpark-stanford", repos: 6, commits6mo: 23, activity: "Inactive", topRepos: [
      { name: "cs229-project", lang: "Python", stars: 0, desc: "ML course final project", complexity: "Low" },
    ]},
    skills: [
      { name: "React", status: "flagged", detail: "Claims 2 years — only one repo with a basic counter component, created 3 weeks ago" },
      { name: "Node.js", status: "unverified", detail: "Claimed — no evidence found" },
      { name: "TypeScript", status: "unverified", detail: "Claimed — no evidence found" },
      { name: "AWS", status: "unverified", detail: "Claimed — zero evidence" },
      { name: "PostgreSQL", status: "unverified", detail: "Claimed — no database work found" },
    ],
    deployments: [
      { url: "davidpark-portfolio.com", status: "dead", desc: "Portfolio link returns 404" },
      { url: "dpark-todo.herokuapp.com", status: "dead", desc: "Heroku app — 'Application Error' page" },
    ],
    commitStyle: "40 of 43 total commits are variations of 'fix', 'update', or 'stuff'",
    insights: [
      { icon: "code", label: "Code Quality", text: "Near-zero signal. 6 repos, all course work, no tests, no docs. Tutorial-level only." },
      { icon: "target", label: "JD Alignment", text: "0/5 confirmed. React flagged — counter component created 3 weeks ago. Resume appears inflated." },
      { icon: "git", label: "Commit Pattern", text: "23 commits in 6mo. 40/43 lifetime commits say 'fix', 'update', or 'stuff'." },
      { icon: "signal", label: "Overall Signal", text: "Stanford, 3.8 GPA — but that's where the signal ends. Both deploy links are dead. Strong pass." },
    ],
    experience: "1 year",
  },
];

export const ELIMINATED_CANDIDATES: EliminatedCandidate[] = [
  { name: "Alex Turner", reason: "No GitHub profile linked — hard requirement", phase: 1 },
  { name: "Maria Gonzalez", reason: "0 years experience listed — requires 3+", phase: 1 },
  { name: "Kevin Wu", reason: "Resume lists only Java and C++ — no React or Node.js", phase: 1 },
  { name: "Fatima Al-Hassan", reason: "No GitHub profile linked — hard requirement", phase: 1 },
  { name: "Chris Miller", reason: "Resume is a single paragraph with no parseable skills", phase: 1 },
  { name: "Jordan Lee", reason: "1 year experience — requires 3+", phase: 1 },
  { name: "Nicole Brown", reason: "No web technologies listed — backend C#/.NET only", phase: 1 },
];
