import { Box01FullwidthZoneChart } from "@/components/dashboard/workbench/box-01-fullwidth-zone-chart";
import { Box02HigherWorseTable } from "@/components/dashboard/workbench/box-02-higher-worse-table";
import { Box03LowerWorseTable } from "@/components/dashboard/workbench/box-03-lower-worse-table";
import { BoxPlaceholder } from "@/components/dashboard/workbench/box-placeholder";
import type { LabWorkbenchPayload } from "@/lib/contracts";

interface BoxRendererProps {
  payload: LabWorkbenchPayload;
}

export function BoxRenderer({ payload }: BoxRendererProps) {
  if (payload.activeBoxId === "box-01") {
    if (!payload.box01) {
      return <BoxPlaceholder boxId="box-01" title="Weight Trend" />;
    }
    return <Box01FullwidthZoneChart payload={payload.box01} />;
  }

  if (payload.activeBoxId === "box-02") {
    if (!payload.box02) {
      return <BoxPlaceholder boxId="box-02" title="Higher-is-Worse Clinicals" />;
    }
    return <Box02HigherWorseTable payload={payload.box02} />;
  }

  if (payload.activeBoxId === "box-03") {
    if (!payload.box03) {
      return <BoxPlaceholder boxId="box-03" title="Lower-is-Worse Clinicals" />;
    }
    return <Box03LowerWorseTable payload={payload.box03} />;
  }

  const tab = payload.tabs.find((item) => item.id === payload.activeBoxId);
  return <BoxPlaceholder boxId={payload.activeBoxId} title={tab?.title ?? "Unimplemented box"} />;
}
