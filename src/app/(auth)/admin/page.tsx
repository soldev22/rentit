import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>

      <ul style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
        <li style={{ marginBottom: 8 }}>
          <Link href="/admin/users">Manage Users</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link href="/admin/users/invite">Invite User</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link href="/admin/audit">Audit Log</Link>
        </li>
        {/* Add more links to admin functional components here as needed */}
      </ul>
    </div>
  );
}
