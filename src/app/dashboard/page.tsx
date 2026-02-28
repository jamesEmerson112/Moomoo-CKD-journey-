import { redirect } from "next/navigation";

interface DashboardRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardRedirectPage({ searchParams }: DashboardRedirectPageProps) {
  const params = await searchParams;
  const range =
    typeof params.range === "string" && ["all", "7d", "30d", "90d"].includes(params.range) ? params.range : null;
  const box = typeof params.box === "string" ? params.box : null;

  const query = new URLSearchParams();
  if (range) {
    query.set("range", range);
  }
  if (box) {
    query.set("box", box);
  }

  if (query.size > 0) {
    redirect(`/?${query.toString()}`);
  }

  redirect("/");
}
