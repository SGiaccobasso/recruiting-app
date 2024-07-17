import { NextResponse } from "next/server";
import axios from "axios";
import TOML from "@iarna/toml";

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ecosystemsUrl =
  "https://api.github.com/repos/electric-capital/crypto-ecosystems/contents/data/ecosystems";

// Create axios instance
const github = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

async function getEcosystemRepos(repoLimit, offset) {
  try {
    const repoUrls = [];
    const { data: folders } = await github.get(ecosystemsUrl);

    for (const folder of folders) {
      if (repoUrls.length >= repoLimit + offset) break;

      const { data: files } = await github.get(folder.url);

      for (const file of files) {
        if (repoUrls.length >= repoLimit + offset) break;
        if (file.name.endsWith(".toml")) {
          const { data: tomlContent } = await github.get(file.download_url);
          const ecosystemData = TOML.parse(tomlContent);

          if (ecosystemData.repo) {
            repoUrls.push(...ecosystemData.repo);
          }
        }
      }
    }

    return repoUrls.slice(offset, offset + repoLimit);
  } catch (error) {
    console.error("Error fetching ecosystem repos:", error.message);
    return [];
  }
}

async function getRelevantCandidates(repoUrls, maxCandidatesPerRepo) {
  const candidatesMap = new Map();

  for (const url of repoUrls) {
    try {
      const [owner, repo] = url.split("/").slice(-2);
      console.log(`Fetching top contributors for ${owner}/${repo}...`);

      const response = await github.get(
        `/repos/${owner}/${repo}/contributors`,
        {
          params: {
            per_page: maxCandidatesPerRepo,
            sort: "contributions",
            order: "desc",
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((contributor) => {
          if (contributor.login && !candidatesMap.has(contributor.login)) {
            candidatesMap.set(contributor.login, {
              user: contributor.login,
              contributions: contributor.contributions,
              repo: `/${owner}/${repo}`,
            });
          }
        });
        console.log(
          `Found ${response.data.length} top contributors for ${owner}/${repo}`
        );
      } else {
        console.warn(`No contributors data for ${owner}/${repo}`);
      }
    } catch (error) {
      console.error(`Error fetching contributors for ${url}:`, error.message);
    }
  }

  const candidates = Array.from(candidatesMap.values());
  console.log(`Found ${candidates.length} unique candidates`);
  return candidates;
}

async function filterByTechnologies(
  candidates,
  requiredTechnologies,
  requireAllTechnologies
) {
  const filteredCandidates = [];

  for (const candidate of candidates) {
    console.log(`Fetching repositories for ${candidate.user}...`);
    try {
      const { data: repos } = await github.get(
        `/users/${candidate.user}/repos`,
        {
          params: { per_page: 100 },
        }
      );

      const userTechs = new Set(
        repos.map((repo) => repo.language?.toLowerCase()).filter(Boolean)
      );

      const matchedTechnologies = requiredTechnologies.filter((tech) =>
        userTechs.has(tech.toLowerCase())
      );

      if (requireAllTechnologies) {
        if (matchedTechnologies.length === requiredTechnologies.length) {
          filteredCandidates.push({
            ...candidate,
            matchedTechnologies,
          });
        }
      } else {
        if (matchedTechnologies.length > 0) {
          filteredCandidates.push({
            ...candidate,
            matchedTechnologies,
          });
        }
      }
    } catch (error) {
      console.error(
        `Error fetching repos for ${candidate.user}:`,
        error.message
      );
    }
  }

  return filteredCandidates;
}

async function getContactInformation(login) {
  try {
    const { data: user } = await github.get(`/users/${login}`);
    return user;
  } catch (error) {
    console.error(
      `Error fetching contact information for ${login}:`,
      error.message
    );
    return { email: null };
  }
}

async function getRecentContributions(username) {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const fromDate = threeMonthsAgo.toISOString().split("T")[0];

    const { data: events } = await github.get(`/users/${username}/events`, {
      params: {
        per_page: 100,
        page: 1,
      },
    });

    const recentContributions = events.filter(
      (event) =>
        new Date(event.created_at) >= threeMonthsAgo &&
        ["PushEvent", "PullRequestEvent", "IssuesEvent"].includes(event.type)
    ).length;

    return recentContributions;
  } catch (error) {
    console.error(
      `Error fetching recent contributions for ${username}:`,
      error.message
    );
    return 0;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repoLimit = parseInt(searchParams.get("repoLimit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");
  const maxCandidatesPerRepo = parseInt(
    searchParams.get("maxCandidatesPerRepo") || "1"
  );
  const requiredTechnologies = searchParams
    .get("requiredTechnologies")
    ?.split(",") || ["solidity", "javascript", "web3"];
  const requireAllTechnologies =
    searchParams.get("requireAllTechnologies") === "true";
  try {
    const repoUrls = await getEcosystemRepos(repoLimit, offset);
    const candidates = await getRelevantCandidates(
      repoUrls.map((repo) => repo.url),
      maxCandidatesPerRepo
    );
    const filteredCandidates = await filterByTechnologies(
      candidates,
      requiredTechnologies,
      requireAllTechnologies
    );

    const candidatesWithInfo = await Promise.all(
      filteredCandidates.map(async (candidate) => {
        const contactInfo = await getContactInformation(candidate.user);
        const recentContributions = await getRecentContributions(
          candidate.user
        );
        return { ...candidate, contactInfo, recentContributions };
      })
    );

    return NextResponse.json(candidatesWithInfo);
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred: " + error.message },
      { status: 500 }
    );
  }
}
