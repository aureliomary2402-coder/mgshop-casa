// lib/github.ts
// Richiede le variabili d'ambiente:
//   GITHUB_TOKEN  -> Personal Access Token (fine-grained, sola lettura basta) da github.com/settings/tokens
//   GITHUB_REPO   -> formato "utente/nome-repo", es. "marco/mgshop"

export type CommitSummary = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type IssueSummary = {
  number: number;
  title: string;
  state: string;
  url: string;
};

function authHeaders() {
  const { GITHUB_TOKEN } = process.env;
  if (!GITHUB_TOKEN) throw new Error("Manca GITHUB_TOKEN nelle variabili d'ambiente");
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
}

export async function getRecentCommits(limit = 5): Promise<CommitSummary[]> {
  const { GITHUB_REPO } = process.env;
  if (!GITHUB_REPO) throw new Error("Manca GITHUB_REPO nelle variabili d'ambiente");

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${limit}`,
    { headers: authHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();
  return data.map((c: any) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
  }));
}

export async function getOpenIssues(limit = 5): Promise<IssueSummary[]> {
  const { GITHUB_REPO } = process.env;
  if (!GITHUB_REPO) throw new Error("Manca GITHUB_REPO nelle variabili d'ambiente");

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=${limit}`,
    { headers: authHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();
  return data
    .filter((i: any) => !i.pull_request)
    .map((i: any) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      url: i.html_url,
    }));
}
