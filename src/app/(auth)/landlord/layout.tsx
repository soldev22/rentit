export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        padding: "20px",
        paddingTop: "20px",
      }}
    >
      {children}
    </main>
  );
}
