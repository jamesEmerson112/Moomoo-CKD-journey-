import { redirect } from "next/navigation";

interface AppCatchallPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function AppCatchallPage({ params }: AppCatchallPageProps) {
  await params;
  redirect("/?notice=read-only");
}
