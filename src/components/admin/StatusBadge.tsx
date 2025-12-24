export default function StatusBadge({ status }: { status: string }) {
  const className =
    status === "INVITED"
      ? "bg-amber-100 text-amber-800"
      : status === "PAUSED"
      ? "bg-gray-200 text-gray-700"
      : "bg-green-100 text-green-800";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}
