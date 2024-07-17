import GithubCandidates from "../components/Candidates";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full bg-gray-800 p-5 rounded-2xl">
        <h1 className="text-2xl font-semibold text-center mb-8 text-gray-200">
          Find Candidates
        </h1>
        <GithubCandidates />
      </div>
    </main>
  );
}
