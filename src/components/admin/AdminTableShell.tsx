export default function AdminTableShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <h2 className="font-sans mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
