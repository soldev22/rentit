export default function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "INVITED"
      ? { bg: "#fef3c7", fg: "#92400e" }
      : status === "PAUSED"
      ? { bg: "#e5e7eb", fg: "#374151" }
      : { bg: "#dcfce7", fg: "#166534" };

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: styles.bg,
        color: styles.fg,
      }}
    >
      {status}
    </span>
  );
}
