import PacmanGame from "@/components/PacmanGame";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#02030f] via-[#03071c] to-[#120528] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-[0.25em] text-yellow-300 drop-shadow-md">
              PAC-MAN // NEO
            </h1>
            <p className="max-w-xl text-sm text-zinc-300">
              Guide Pac-Man through the neon maze, gobble pellets, dodge ghosts, and chase high scores.
              Use arrow keys (or WASD) on desktop, tap the controllers on mobile.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Built with Next.js &amp; Tailwind CSS
          </div>
        </header>
        <PacmanGame />
      </div>
    </div>
  );
}
