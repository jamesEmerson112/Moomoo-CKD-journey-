import type { DailyLogRecord } from "@/lib/contracts";

interface RecentLogsTableProps {
  logs: DailyLogRecord[];
}

export function RecentLogsTable({ logs }: RecentLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="panel">
        <p className="text-sm text-slate-300">No logs yet. Add entries to `content/medical_logs.json` to populate this table.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm text-slate-100">
        <thead className="sticky top-0 border-b border-white/10 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-300">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Water</th>
            <th className="px-3 py-2">Appetite</th>
            <th className="px-3 py-2">Energy</th>
            <th className="px-3 py-2">Vomiting</th>
            <th className="px-3 py-2">Weight</th>
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-white/5 align-top">
              <td className="px-3 py-2 font-medium">{log.date}</td>
              <td className="px-3 py-2">{typeof log.waterIntakeOz === "number" ? `${log.waterIntakeOz} oz` : "-"}</td>
              <td className="px-3 py-2">{typeof log.appetiteScore === "number" ? `${log.appetiteScore}/5` : "-"}</td>
              <td className="px-3 py-2">{typeof log.energyScore === "number" ? `${log.energyScore}/5` : "-"}</td>
              <td className="px-3 py-2">{typeof log.vomitingCount === "number" ? log.vomitingCount : "-"}</td>
              <td className="px-3 py-2">{typeof log.weightLb === "number" ? `${log.weightLb} lb` : "-"}</td>
              <td className="px-3 py-2 text-slate-300">{log.notes ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
