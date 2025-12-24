import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1>Admin</h1>

      <ul className="mt-4 list-none p-0">
        <li className="mb-2">
          <Link href="/admin/users">Manage Users</Link>
        </li>
        <li className="mb-2">
          <Link href="/admin/users/invite">Invite User</Link>
        </li>
        <li className="mb-2">
          <Link href="/admin/audit">Audit Log</Link>
        </li>
        {/* Add more links to admin functional components here as needed */}
      </ul>
    </div>
  );
}
