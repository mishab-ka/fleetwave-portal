import React from "react";
import AdminLayout from "@/components/AdminLayout";
import TodoComponent from "@/components/admin/todo/TodoComponent";

const AdminTaskManager: React.FC = () => {
  return (
    <AdminLayout title="Task Manager">
      <TodoComponent />
    </AdminLayout>
  );
};

export default AdminTaskManager;
