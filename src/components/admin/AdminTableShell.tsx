export default function AdminTableShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h2
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
