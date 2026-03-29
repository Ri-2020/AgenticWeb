import JobPage from "./client";

export function generateStaticParams() {
  // Placeholder so Next.js static export generates a shell HTML file.
  // Firebase Hosting rewrites serve this shell for all /jobs/* paths.
  return [{ jobId: "__ph__" }];
}

export default function Page() {
  return <JobPage />;
}
