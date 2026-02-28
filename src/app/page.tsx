import { LabWorkbenchShell } from "@/components/dashboard";
import { getLabWorkbenchPayload } from "@/lib/data";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const range =
    typeof params.range === "string" && ["all", "7d", "30d", "90d"].includes(params.range)
      ? (params.range as "all" | "7d" | "30d" | "90d")
      : "all";
  const box = typeof params.box === "string" ? params.box : null;

  const payload = await getLabWorkbenchPayload({
    range,
    box
  });

  return <LabWorkbenchShell payload={payload} notice={notice} />;
}
