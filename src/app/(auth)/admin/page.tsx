import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>

      <ul style={{ marginTop: 16 }}>
        <li>
          <Link href="/admin/users">
            Manage users
          </Link><br></br>
          <a href="/admin/audit">Audit log</a>

        </li>
      </ul>
    </div>
  );
}
