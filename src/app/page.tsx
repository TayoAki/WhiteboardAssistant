/** Landing page shown at `/` until sign-in and boards arrive in S-2 and S-3. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">WhiteboardAssistant</h1>
      <p className="max-w-md text-balance text-zinc-600 dark:text-zinc-400">
        An AI whiteboard: an Excalidraw canvas with a copilot that can see and edit the board.
      </p>
      <p className="text-sm text-zinc-500">Sign-in and boards arrive in the next slices.</p>
    </main>
  );
}
