import GithubCandidates from "../components/Candidates";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">
          GitHub Candidates
        </h1>
        <GithubCandidates />
      </div>
    </main>
  );
}
