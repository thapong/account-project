import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { listUsers } from "@/app/users/actions";
import CreateUserForm from "@/app/users/CreateUserForm";
import UserRowActions from "@/app/users/UserRowActions";
import { PaginationControls } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireUser(["admin"]);
  const params = searchParams ? await searchParams : {};
  const users = await listUsers(params);
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div><p className="page-kicker">การตั้งค่า</p><h1 className="page-title">ผู้ใช้งาน</h1><p className="page-description">จัดการบัญชี บทบาท และสถานะการเข้าใช้งาน</p></div>
        <CreateUserForm />
        <section className="panel">
          <div className="p-5 border-b border-border"><h2 className="panel-heading">บัญชีทั้งหมด</h2><p className="text-sm text-bodytext">{users.total} รายการ</p></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>ผู้ใช้งาน</th><th>บทบาท</th><th>สถานะ</th><th className="text-right">การจัดการ</th></tr></thead><tbody>
            {users.rows.map((user) => <tr key={user.id}>
              <td><div className="font-semibold text-dark">{user.display_name}</div><div className="text-sm text-bodytext">{user.email}</div></td>
              <td><UserRowActions user={user} /></td>
              <td><span className={`badge ${user.is_active ? "badge-success" : "badge-muted"}`}>{user.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td>
              <td><span className="text-sm text-bodytext">ใช้ปุ่มในคอลัมน์บทบาทเพื่อบันทึก</span></td>
            </tr>)}
            {!users.rows.length ? <tr><td colSpan={4}><div className="empty-state">ยังไม่มีผู้ใช้งาน</div></td></tr> : null}
          </tbody></table></div>
          <PaginationControls pathname="/users" page={users.page} pageSize={users.pageSize} total={users.total} />
        </section>
      </div>
    </AppLayout>
  );
}
