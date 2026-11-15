"use client";

/** Shown only when a page had to use the bundled demo data. */
export default function DemoDataNotice({
  show,
  what,
}: {
  show: boolean;
  what: string;
}) {
  if (!show) return null;
  return (
    <p
      role="status"
      style={{
        margin: "0 0 1rem",
        padding: "0.6rem 0.9rem",
        borderRadius: "0.5rem",
        border: "1px solid #f0b429",
        background: "#fff8e1",
        color: "#7a4f01",
        fontSize: "0.85rem",
      }}
    >
      The backend is not reachable, so demo {what} are shown. Start the API on
      port 3001 and reload to use live data.
    </p>
  );
}
