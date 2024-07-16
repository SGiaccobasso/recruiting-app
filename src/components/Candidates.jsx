"use client";

import { useState } from "react";
import axios from "axios";

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
    "web3",
  ]);
  const [requireAllTechnologies, setRequireAllTechnologies] = useState(false);

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
      console.log(response.data);
      //create an alert if no candidates are fount (empty array)
      if (response.data.length === 0) {
        alert("No candidates found");
      }
      setCandidates(response.data);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setError("Failed to fetch candidates. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">GitHub Candidates</h2>
      <div className="space-y-2">
        <div>
          <label htmlFor="repoLimit" className="block">
            Repo Limit:
          </label>
          <input
            id="repoLimit"
            type="number"
            value={repoLimit}
            onChange={(e) => setRepoLimit(Number(e.target.value))}
            className="border p-1"
          />
        </div>
        <div>
          <label htmlFor="offset" className="block">
            Offset:
          </label>
          <input
            id="offset"
            type="number"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="border p-1"
          />
        </div>
        <div>
          <label htmlFor="maxCandidatesPerRepo" className="block">
            Max Candidates Per Repo:
          </label>
          <input
            id="maxCandidatesPerRepo"
            type="number"
            value={maxCandidatesPerRepo}
            onChange={(e) => setMaxCandidatesPerRepo(Number(e.target.value))}
            className="border p-1"
          />
        </div>
        <div>
          <label htmlFor="requiredTechnologies" className="block">
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
            className="border p-1 w-full"
          />
        </div>
        <div>
          <label className="flex items-center">
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
        <button
          onClick={fetchCandidates}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        >
          {loading ? "Fetching..." : "Fetch Candidates"}
        </button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {candidates.length > 0 && (
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <h3 className="text-xl font-semibold">{candidate.user}</h3>
              <p>Email: {candidate.contactInfo?.email || "Not available"}</p>
              <p>Repo: {candidate.repo}</p>
              <p>Contributions: {candidate.contributions}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
