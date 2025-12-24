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
        className="fixed inset-0 bg-black/45 z-50"
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-xl shadow-2xl z-[51] font-sans">
        <div className="p-4 border-b border-gray-200">
          <h3 className="m-0">{title}</h3>
          {subtitle && (
            <p className="m-0 mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </>
  );
}
