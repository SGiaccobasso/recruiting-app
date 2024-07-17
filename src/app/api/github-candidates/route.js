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

async function getEcosystemRepos(
  repoLimit,
  offset,
  requiredTechnologies,
  requireAllTechnologies
) {
  try {
    const repoUrls = [];
    const { data: folders } = await github.get(ecosystemsUrl);
    let processedRepos = 0;

    for (const folder of folders) {
      if (processedRepos >= offset + repoLimit) break;

      const { data: files } = await github.get(folder.url);

      for (const file of files) {
        if (processedRepos >= offset + repoLimit) break;
        if (file.name.endsWith(".toml")) {
          const { data: tomlContent } = await github.get(file.download_url);
          const ecosystemData = TOML.parse(tomlContent);

          if (ecosystemData.repo && Array.isArray(ecosystemData.repo)) {
            if (processedRepos >= offset + repoLimit) break;

            for (const repoObj of ecosystemData.repo) {
              if (processedRepos >= offset + repoLimit) break;

              if (repoObj.url && !repoObj.missing) {
                if (processedRepos < offset) {
                  processedRepos++;
                  continue;
                }
                console.log(
                  `Processing repo ${repoObj.url}... index ${processedRepos}`
                );

                const urlParts = repoObj.url.split("/");
                const owner = urlParts[urlParts.length - 2];
                const repo = urlParts[urlParts.length - 1];

                try {
                  const { data: repoData } = await github.get(
                    `/repos/${owner}/${repo}`
                  );
                  const repoLanguage = repoData.language?.toLowerCase();

                  const matchedTechnologies = requiredTechnologies.filter(
                    (tech) => tech.toLowerCase() === repoLanguage
                  );

                  if (
                    (requireAllTechnologies &&
                      matchedTechnologies.length ===
                        requiredTechnologies.length) ||
                    (!requireAllTechnologies && matchedTechnologies.length > 0)
                  ) {
                    repoUrls.push({
                      url: repoObj.url,
                      matchedTechnologies,
                    });
                  }
                } catch (error) {
                  console.error(
                    `Error fetching repo data for ${repoObj.url}:`,
                    error.message
                  );
                }

                processedRepos++;
                if (repoUrls.length >= repoLimit) break;
              }
            }
          }
        }
      }
    }

    return { repoUrls, processedRepos };
  } catch (error) {
    console.error("Error fetching ecosystem repos:", error.message);
    return [];
  }
}

async function getRelevantCandidates(repoUrls, maxCandidatesPerRepo) {
  const candidatesMap = new Map();

  for (const { url, matchedTechnologies } of repoUrls) {
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
              matchedTechnologies,
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
    const { repoUrls, processedRepos } = await getEcosystemRepos(
      repoLimit,
      offset,
      requiredTechnologies,
      requireAllTechnologies
    );
    const candidates = await getRelevantCandidates(
      repoUrls,
      maxCandidatesPerRepo
    );

    const candidatesWithInfo = await Promise.all(
      candidates.map(async (candidate) => {
        const contactInfo = await getContactInformation(candidate.user);
        const recentContributions = await getRecentContributions(
          candidate.user
        );
        return { ...candidate, contactInfo, recentContributions };
      })
    );

    return NextResponse.json({ candidatesWithInfo, processedRepos });
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred: " + error.message },
      { status: 500 }
    );
  }
}
