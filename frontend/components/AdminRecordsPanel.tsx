"use client";

import { useState, type ReactNode } from "react";

/**
 * Keeps saved records tucked away behind a button so an admin page only shows
 * the fields currently being filled in until the records are asked for.
 */
export default function AdminRecordsPanel({
  label,
  count,
  children,
}: {
  /** Noun phrase used on the toggle, e.g. "saved routes". */
  label: string;
  /** Total number of saved records, shown as a badge on the toggle. */
  count?: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`admin-records-panel${expanded ? " is-expanded" : ""}`}>
      <button
        type="button"
        className="admin-records-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="admin-records-toggle-label">
          <span className="admin-records-chevron" aria-hidden="true">▸</span>
          {expanded ? "Hide" : "Show"} {label}
        </span>
        {typeof count === "number" && (
          <span
            className="admin-records-count"
            aria-label={`${count} saved record${count === 1 ? "" : "s"}`}
          >
            {count}
          </span>
        )}
      </button>
      {expanded && <div className="admin-records-panel-body">{children}</div>}
    </div>
  );
}
