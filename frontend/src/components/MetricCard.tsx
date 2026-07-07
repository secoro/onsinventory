import { ReactNode } from "react";

export default function MetricCard({
  icon,
  label,
  value,
  onClick,
  active
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-900/80 p-5 transition ${
        onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80" : ""
      } ${active ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200 dark:border-slate-800"}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-100">{icon}</div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
