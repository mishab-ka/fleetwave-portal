import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Lead {
  id: string;
  phone_number: string;
  name?: string;
  status: "pending" | "called" | "confirmed" | "rejected";
  called_by?: string;
  called_at?: string;
  updated_at?: string;
  notes?: string;
}

export default function AdminPartTimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase
      .from("part_time_leads")
      .select("*")
      .order("updated_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to fetch leads");
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleAddNumber = async () => {
    if (!newNumber.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("part_time_leads").insert({
      phone_number: newNumber.trim(),
      name: newName.trim() || null,
    });
    if (error) {
      toast.error("Failed to add number");
    } else {
      toast.success("Number added!");
      setNewNumber("");
      setNewName("");
      fetchLeads();
    }
    setAdding(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkNumbers.trim()) return;
    setAdding(true);
    // Bulk input: one number per line, optionally comma-separated with name
    const rows = bulkNumbers
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);
    const inserts = rows.map((row) => {
      const [number, ...nameParts] = row.split(",");
      return {
        phone_number: number.trim(),
        name: nameParts.join(",").trim() || null,
      };
    });
    const { error } = await supabase.from("part_time_leads").insert(inserts);
    if (error) {
      toast.error("Failed to add numbers");
    } else {
      toast.success("Numbers added!");
      setBulkNumbers("");
      fetchLeads();
    }
    setAdding(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-fuchsia-700">
        Admin: Part-Time Leads
      </h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Add single number */}
        <div className="bg-white rounded-xl shadow p-4 border">
          <h3 className="font-semibold mb-2">Add New Number</h3>
          <Input
            placeholder="Phone number"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="mb-2"
          />
          <Input
            placeholder="Name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mb-2"
          />
          <Button
            onClick={handleAddNumber}
            disabled={adding || !newNumber.trim()}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          >
            {adding ? "Adding..." : "Add Number"}
          </Button>
        </div>
        {/* Bulk add */}
        <div className="bg-white rounded-xl shadow p-4 border">
          <h3 className="font-semibold mb-2">Bulk Add Numbers</h3>
          <Textarea
            placeholder="One per line. Format: 9876543210, Name"
            value={bulkNumbers}
            onChange={(e) => setBulkNumbers(e.target.value)}
            rows={6}
            className="mb-2"
          />
          <Button
            onClick={handleBulkAdd}
            disabled={adding || !bulkNumbers.trim()}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          >
            {adding ? "Adding..." : "Add All"}
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "pending", "called", "confirmed", "rejected"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            className={filter === s ? "bg-fuchsia-600 text-white" : ""}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow border">
          <thead>
            <tr className="bg-fuchsia-50">
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Called By</th>
              <th className="p-2 text-left">Called At</th>
              <th className="p-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-4 text-muted-foreground"
                >
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-fuchsia-50">
                  <td className="p-2 font-mono">{lead.phone_number}</td>
                  <td className="p-2">{lead.name}</td>
                  <td className="p-2 capitalize">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        lead.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : lead.status === "called"
                          ? "bg-blue-100 text-blue-800"
                          : lead.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {lead.called_by || "-"}
                  </td>
                  <td className="p-2 text-xs">
                    {lead.called_at
                      ? new Date(lead.called_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2 text-xs">{lead.notes || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
