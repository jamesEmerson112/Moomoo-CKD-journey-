import { redirect } from "next/navigation";

interface DashboardRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardRedirectPage({ searchParams }: DashboardRedirectPageProps) {
  const params = await searchParams;
  const range =
    typeof params.range === "string" && ["7d", "30d", "90d"].includes(params.range) ? params.range : null;

  if (range) {
    redirect(`/?range=${range}`);
  }

  redirect("/");
}
