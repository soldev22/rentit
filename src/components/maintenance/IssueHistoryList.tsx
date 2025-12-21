import React from "react";

export type IssueHistoryItem = {
  text: string;
  createdAt: string;
  createdBy?: string;
  role: string;
  createdAtLabel?: string;
};

interface IssueHistoryListProps {
  history: IssueHistoryItem[];
  variant?: "tenant" | "manager";
}

export default function IssueHistoryList({ history, variant = "manager" }: IssueHistoryListProps) {
  if (!history || history.length === 0) {
    return <p className={variant === "tenant" ? "text-sm text-gray-200" : "text-sm text-slate-400"}>No updates yet.</p>;
  }

  return (
    <ul className={variant === "tenant" ? "space-y-1" : "space-y-1"}>
      {[...history].reverse().map((item, index, arr) => (
        <li
          key={index}
          className={
            variant === "tenant"
              ? `rounded border px-3 py-2 ${index === 0 ? "bg-white border-foreground text-foreground" : "bg-gray-400 border-foreground text-foreground"}`
              : `rounded border px-3 py-2 ${index === 0 ? "border-indigo-500/40 bg-indigo-500/10" : "border-slate-800 bg-slate-950"}`
          }
        >
          <div className={variant === "tenant" ? "text-sm text-gray-800 mb-1" : "text-xs text-slate-400 mb-0.5"}>
            <strong className="uppercase">{item.role}</strong>
            {" · "}
            {item.createdAtLabel || new Date(item.createdAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
          <div className={variant === "tenant" ? "whitespace-pre-wrap text-gray-900" : "whitespace-pre-wrap text-sm text-slate-200"}>
            {item.text}
          </div>
        </li>
      ))}
    </ul>
  );
}
