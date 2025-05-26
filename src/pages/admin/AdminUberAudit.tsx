import { UberAuditManager } from "@/components/admin/uber/UberAuditManager";
import AdminLayout from "@/components/AdminLayout";

export default function AdminUberAudit() {
  return (
    <AdminLayout title="Uber Audit">
      <UberAuditManager />
    </AdminLayout>
  );
}
