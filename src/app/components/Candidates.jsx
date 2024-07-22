"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import useLocalStorage from "../hooks/useLocalStorage";

export default function GithubCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repoLimit, setRepoLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [maxCandidatesPerRepo, setMaxCandidatesPerRepo] = useState(1);
  const [requiredTechnologies, setRequiredTechnologies] = useState([
    "solidity",
    "javascript",
  ]);
  const [requireAllTechnologies, setRequireAllTechnologies] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [lastIndexChecked, setLastIndexChecked] = useLocalStorage(
    "lastIndexChecked",
    0
  );

  const copyToClipboard = (email) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000); // Reset after 2 seconds
    });
  };

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/github-candidates", {
        params: {
          repoLimit,
          offset,
          maxCandidatesPerRepo,
          requiredTechnologies: requiredTechnologies.join(","),
          requireAllTechnologies: requireAllTechnologies,
        },
      });
      if (response.data.candidatesWithInfo.length === 0) {
        alert("No candidates found");
      }
      setCandidates(response.data.candidatesWithInfo);
      setLastIndexChecked(response.data.processedRepos);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setError("Failed to fetch candidates. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-gray-200">Customize Search:</h2>
      <div className="space-y-2">
        <div>
          <label htmlFor="repoLimit" className="block text-gray-400">
            Repo Limit:
          </label>
          <input
            id="repoLimit"
            type="number"
            value={repoLimit}
            onChange={(e) => setRepoLimit(Number(e.target.value))}
            className="p-2 w-full bg-secondary rounded-md text-gray-400"
          />
        </div>
        <div>
          <label htmlFor="offset" className="block text-gray-400">
            Offset:
          </label>
          <input
            id="offset"
            type="number"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="p-2 w-full bg-secondary rounded-md text-gray-400"
          />
        </div>
        <div>
          <label htmlFor="maxCandidatesPerRepo" className="block text-gray-400">
            Max Candidates Per Repo:
          </label>
          <input
            id="maxCandidatesPerRepo"
            type="number"
            value={maxCandidatesPerRepo}
            onChange={(e) => setMaxCandidatesPerRepo(Number(e.target.value))}
            className="p-2 w-full bg-secondary rounded-md text-gray-400"
          />
        </div>
        <div>
          <label htmlFor="requiredTechnologies" className="block text-gray-400">
            Required Technologies (comma-separated):
          </label>
          <input
            id="requiredTechnologies"
            type="text"
            value={requiredTechnologies.join(",")}
            onChange={(e) =>
              setRequiredTechnologies(
                e.target.value.split(",").map((tech) => tech.trim())
              )
            }
            className="p-2 w-full bg-secondary rounded-md text-gray-400"
          />
        </div>
        <div>
          <label className="flex items-center text-gray-400">
            <input
              type="checkbox"
              checked={requireAllTechnologies}
              onChange={(e) => setRequireAllTechnologies(e.target.checked)}
              className="mr-2"
            />
            Require ALL technologies (if unchecked, any of the technologies is
            sufficient)
          </label>
        </div>
        <div className="flex row justify-end py-2">
          <button
            onClick={fetchCandidates}
            disabled={loading}
            className="bg-primary text-black font-semibold px-4 py-2 rounded disabled:bg-gray-300"
          >
            {loading ? "Fetching..." : "Fetch Candidates"}
          </button>
        </div>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <p className="text-gray-400">Last index checked: {lastIndexChecked}</p>
      {candidates.length > 0 && (
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <Link
                rel="noopener noreferrer"
                href={`https://github.com/${candidate.user}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-accent hover:underline"
              >
                <h3 className="text-xl font-medium text-gray-200">
                  {candidate.user}
                </h3>
              </Link>
              <div className="flex items-center">
                <p className="text-gray-400">Email: &nbsp;</p>
                {candidate.contactInfo?.email ? (
                  <button
                    onClick={() => copyToClipboard(candidate.contactInfo.email)}
                    className="text-primary hover:underline focus:outline-none"
                  >
                    {candidate.contactInfo.email}
                  </button>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
                {candidate.contactInfo?.email &&
                  copiedEmail === candidate.contactInfo?.email && (
                    <span className="ml-2 text-green-500 text-sm">Copied!</span>
                  )}
              </div>
              <div className="flex">
                <p className="text-gray-400">Repo: &nbsp;</p>
                <Link
                  rel="noopener noreferrer"
                  href={`https://github.com${candidate.repo}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-accent hover:underline"
                >
                  <p className="text-primary">{candidate.repo}</p>
                </Link>
              </div>
              <div className="flex">
                <p className="text-gray-400">Contributions: &nbsp;</p>
                <p className="text-primary">{candidate.contributions}</p>
              </div>
              <div className="flex">
                <p className="text-gray-400">Matched Technologies: &nbsp;</p>
                <p className="text-primary">
                  {candidate.matchedTechnologies.join(", ")}
                </p>
              </div>
              <div className="flex">
                <p className="text-gray-400">
                  Contributions in last 3 months: &nbsp;
                </p>
                <p className="text-primary">{candidate.recentContributions}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
