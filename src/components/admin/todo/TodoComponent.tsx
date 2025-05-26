import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

const TodoComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
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

  const addTodo = async () => {
    if (!newTodoTitle.trim()) {
      toast.error("Please enter a todo title");
      return;
    }

    try {
      const { error } = await supabase.from("todos").insert([
        {
          title: newTodoTitle,
          completed: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      setNewTodoTitle("");
      await fetchTodos();
      toast.success("Todo added successfully");
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Failed to add todo");
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ completed: !completed })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Todo List</span>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a new todo"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              className="w-64"
            />
            <Button
              onClick={addTodo}
              className="bg-fleet-purple hover:bg-fleet-purple/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Todo
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] overflow-hidden">
        <div className="h-full overflow-y-auto space-y-4 pr-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className={
                    todo.completed ? "text-green-500" : "text-gray-400"
                  }
                >
                  <Check className="h-5 w-5" />
                </Button>
                <div>
                  <h3
                    className={`font-medium ${
                      todo.completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {todo.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(todo.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTodo(todo.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoComponent;
