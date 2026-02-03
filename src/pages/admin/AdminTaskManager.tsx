import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import TodoComponent from "@/components/admin/todo/TodoComponent";
import { useAdmin } from "@/context/AdminContext";

const AdminTaskManager: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isManager, userRole, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!adminLoading && isManager && !isAdmin && userRole === "manager") {
      navigate("/admin/drivers", { replace: true });
    }
  }, [adminLoading, isAdmin, isManager, userRole, navigate]);

  return (
    <AdminLayout title="Task Manager">
      <TodoComponent />
    </AdminLayout>
  );
};

export default AdminTaskManager;
