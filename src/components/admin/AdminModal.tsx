export default function AdminModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420,
          background: "#ffffff",
          borderRadius: 10,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          zIndex: 51,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}
