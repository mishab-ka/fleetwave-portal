import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  Calendar,
  User,
  Car,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, isToday } from "date-fns";

interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string;
  assigned_user_id: string | null;
  assigned_vehicle_number: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    name: string;
    vehicle_number: string;
  };
  vehicles?: {
    vehicle_number: string;

    fleet_name: string;
  };
}

interface User {
  id: string;
  name: string;
  vehicle_number: string;
}

interface Vehicle {
  vehicle_number: string;

  fleet_name: string;
}

const TodoComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "completed" | "overdue"
  >("all");

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string;
    assigned_user_id: string;
    assigned_vehicle_number: string;
  }>({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    assigned_user_id: "none",
    assigned_vehicle_number: "none",
  });

  useEffect(() => {
    fetchTodos();
    fetchUsers();
    fetchVehicles();
  }, []);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select(
          `
          *,
          users:assigned_user_id (id, name, vehicle_number),
          vehicles:assigned_vehicle_number (vehicle_number, fleet_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error("Error fetching todos:", error);
      toast.error("Failed to load todos");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, vehicle_number")
        .eq("online", true)
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_number, fleet_name")
        .eq("online", true)
        .order("vehicle_number");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a todo title");
      return;
    }

    try {
      const todoData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
        assigned_user_id:
          formData.assigned_user_id === "none"
            ? null
            : formData.assigned_user_id || null,
        assigned_vehicle_number:
          formData.assigned_vehicle_number === "none"
            ? null
            : formData.assigned_vehicle_number || null,
        completed: false,
      };

      if (editingTodo) {
        const { error } = await supabase
          .from("todos")
          .update({ ...todoData, updated_at: new Date().toISOString() })
          .eq("id", editingTodo.id);

        if (error) throw error;
        toast.success("Todo updated successfully");
      } else {
        const { error } = await supabase
          .from("todos")
          .insert([{ ...todoData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        toast.success("Todo added successfully");
      }

      resetForm();
      setIsDialogOpen(false);
      await fetchTodos();
    } catch (error) {
      console.error("Error saving todo:", error);
      toast.error("Failed to save todo");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
      assigned_user_id: "none",
      assigned_vehicle_number: "none",
    });
    setEditingTodo(null);
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          completed: !completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      await fetchTodos();
      toast.success("Todo updated successfully");
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Failed to update todo");
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) throw error;
      await fetchTodos();
      toast.success("Todo deleted successfully");
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("Failed to delete todo");
    }
  };

  const editTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      due_date: todo.due_date,
      assigned_user_id: todo.assigned_user_id || "none",
      assigned_vehicle_number: todo.assigned_vehicle_number || "none",
    });
    setIsDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDueDateStatus = (dueDate: string, completed: boolean) => {
    if (completed) return { status: "completed", color: "text-green-600" };

    const due = new Date(dueDate);
    const now = new Date();

    if (isBefore(due, now)) return { status: "overdue", color: "text-red-600" };
    if (isToday(due)) return { status: "due today", color: "text-orange-600" };
    return { status: "upcoming", color: "text-blue-600" };
  };

  const filteredTodos = todos.filter((todo) => {
    switch (filter) {
      case "pending":
        return !todo.completed;
      case "completed":
        return todo.completed;
      case "overdue":
        return !todo.completed && isBefore(new Date(todo.due_date), new Date());
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Todo Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-fleet-purple">
                Task Management
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {todos.length} Total Tasks
              </Badge>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-fleet-purple hover:bg-fleet-purple/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTodo ? "Edit Task" : "Create New Task"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="title">Task Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter task title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter task description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            priority: value as
                              | "low"
                              | "medium"
                              | "high"
                              | "urgent",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            due_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assigned_user">Assign to Driver</Label>
                      <Select
                        value={formData.assigned_user_id}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            assigned_user_id: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No specific driver
                          </SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.vehicle_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="assigned_vehicle">
                        Assign to Vehicle
                      </Label>
                      <Select
                        value={formData.assigned_vehicle_number}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            assigned_vehicle_number: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No specific vehicle
                          </SelectItem>
                          {vehicles.map((vehicle) => (
                            <SelectItem
                              key={vehicle.vehicle_number}
                              value={vehicle.vehicle_number}
                            >
                              {vehicle.vehicle_number} ({vehicle.fleet_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-fleet-purple hover:bg-fleet-purple/90"
                  >
                    {editingTodo ? "Update Task" : "Create Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {(["all", "pending", "completed", "overdue"] as const).map(
              (filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  onClick={() => setFilter(filterOption)}
                  size="sm"
                  className={
                    filter === filterOption
                      ? "bg-fleet-purple hover:bg-fleet-purple/90"
                      : ""
                  }
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  <Badge variant="secondary" className="ml-2">
                    {filterOption === "all"
                      ? todos.length
                      : filterOption === "pending"
                      ? todos.filter((t) => !t.completed).length
                      : filterOption === "completed"
                      ? todos.filter((t) => t.completed).length
                      : todos.filter(
                          (t) =>
                            !t.completed &&
                            isBefore(new Date(t.due_date), new Date())
                        ).length}
                  </Badge>
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Todo List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tasks found</p>
                <p className="text-gray-400">
                  Create a new task to get started
                </p>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const dueDateStatus = getDueDateStatus(
                  todo.due_date,
                  todo.completed
                );
                return (
                  <div
                    key={todo.id}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      todo.completed
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200 hover:border-fleet-purple/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTodo(todo.id, todo.completed)}
                          className={`mt-1 ${
                            todo.completed
                              ? "text-green-500"
                              : "text-gray-400 hover:text-green-500"
                          }`}
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3
                              className={`font-semibold text-lg ${
                                todo.completed
                                  ? "line-through text-gray-400"
                                  : "text-gray-900"
                              }`}
                            >
                              {todo.title}
                            </h3>
                            <Badge
                              className={`text-xs ${getPriorityColor(
                                todo.priority
                              )}`}
                            >
                              {todo.priority.toUpperCase()}
                            </Badge>
                          </div>

                          {todo.description && (
                            <p
                              className={`text-sm mb-3 ${
                                todo.completed
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {todo.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm">
                            {todo.due_date && (
                              <div
                                className={`flex items-center gap-1 ${dueDateStatus.color}`}
                              >
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Due:{" "}
                                  {format(
                                    new Date(todo.due_date),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                                <span className="font-medium">
                                  ({dueDateStatus.status})
                                </span>
                              </div>
                            )}

                            {todo.users && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <User className="h-4 w-4" />
                                <span>
                                  {todo.users.name} ({todo.users.vehicle_number}
                                  )
                                </span>
                              </div>
                            )}

                            {todo.vehicles && (
                              <div className="flex items-center gap-1 text-purple-600">
                                <Car className="h-4 w-4" />
                                <span>
                                  {todo.vehicles.vehicle_number} (
                                  {todo.vehicles.fleet_name})
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>
                                Created:{" "}
                                {format(
                                  new Date(todo.created_at),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editTodo(todo)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTodo(todo.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoComponent;
