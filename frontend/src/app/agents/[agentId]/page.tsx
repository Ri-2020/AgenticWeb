import AgentPage from "./client";

export function generateStaticParams() {
  // Placeholder so Next.js static export generates a shell HTML file.
  // Firebase Hosting rewrites serve this shell for all /agents/* paths.
  return [{ agentId: "__ph__" }];
}

export default function Page() {
  return <AgentPage />;
}
