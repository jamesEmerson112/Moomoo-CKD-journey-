import { redirect } from "next/navigation";

interface LabPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LabPage({ searchParams }: LabPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (typeof params.range === "string" && ["all", "7d", "30d", "90d"].includes(params.range)) {
    query.set("range", params.range);
  }
  if (typeof params.box === "string") {
    query.set("box", params.box);
  }
  if (typeof params.notice === "string") {
    query.set("notice", params.notice);
  }

  const queryString = query.toString();
  if (queryString) {
    redirect(`/?${queryString}`);
  }
  redirect("/");
}
