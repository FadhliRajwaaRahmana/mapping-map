import { UserTable } from "@/components/admin/user-table";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Users</h1>
      <UserTable />
    </div>
  );
}
