import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wallet, PhoneCall, CheckCircle, XCircle } from "lucide-react";

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

interface WalletTx {
  id: string;
  amount: number;
  created_at: string;
  lead_id: string;
}

export default function PartTimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState<"called" | "confirmed" | "rejected">(
    "called"
  );
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<number>(0);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [showWallet, setShowWallet] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchWallet(data.session.user.id);
    });
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("part_time_leads")
      .select("*")
      .in("status", ["pending", "called"])
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch leads");
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const fetchWallet = async (userId: string) => {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id, amount, created_at, lead_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setWalletTxs(data);
      setWallet(data.reduce((sum, tx) => sum + (tx.amount || 0), 0));
    }
  };

  const handleCall = (lead: Lead) => {
    window.open(`tel:${lead.phone_number}`);
    setSelectedLead(lead);
    setStatus("called");
    setNotes("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedLead || !user) return;
    setUpdating(true);
    const { error } = await supabase
      .from("part_time_leads")
      .update({
        status,
        called_by: user.id,
        called_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes,
      })
      .eq("id", selectedLead.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated!");
      if (status === "confirmed") {
        // Add ₹100 to wallet
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: 100,
          type: "part_time_call",
          lead_id: selectedLead.id,
        });
        toast.success("₹100 added to your wallet!");
        fetchWallet(user.id);
      }
      setSelectedLead(null);
      fetchLeads();
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-8 text-center">Loading leads...</div>;

  return (
    <div className="max-w-md mx-auto p-2 pb-8 min-h-screen bg-gradient-to-b from-fuchsia-50 to-white">
      {/* Wallet summary */}
      <div className="sticky top-0 z-10 bg-white/80 rounded-b-xl shadow-md flex items-center gap-3 px-4 py-3 mb-4 border-b">
        <Wallet className="h-7 w-7 text-fuchsia-600" />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Your Wallet</div>
          <div className="text-2xl font-bold text-fuchsia-700">₹{wallet}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowWallet(true)}>
          View
        </Button>
      </div>

      <h2 className="text-xl font-bold mb-4 text-center text-fuchsia-700">
        📞 Part-Time Leads
      </h2>
      {leads.length === 0 && (
        <div className="text-center text-muted-foreground">
          No leads available right now.
        </div>
      )}
      <div className="space-y-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="border rounded-xl p-4 flex flex-col gap-2 bg-white shadow-md"
          >
            <div className="flex items-center gap-2 mb-1">
              <PhoneCall className="h-5 w-5 text-fuchsia-500" />
              <span className="font-semibold text-lg">
                {lead.name || "Lead"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-1">
              {lead.phone_number}
            </div>
            <div className="flex gap-2 mt-2 items-center">
              <Button
                size="sm"
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                onClick={() => handleCall(lead)}
              >
                Call
              </Button>
              <span
                className={`px-2 py-1 rounded text-xs font-medium capitalize ${
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
            </div>
          </div>
        ))}
      </div>

      {/* Status Update Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border">
            <h3 className="font-bold mb-2 text-fuchsia-700">
              Update Call Status
            </h3>
            <div className="mb-2">
              <div className="font-medium">{selectedLead.name || "Lead"}</div>
              <div className="text-sm text-muted-foreground">
                {selectedLead.phone_number}
              </div>
            </div>
            <div className="mb-2">
              <label className="block mb-1 text-sm">Status</label>
              <select
                className="w-full border rounded p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="called">Called</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block mb-1 text-sm">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the call..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? "Updating..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedLead(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {showWallet && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border">
            <h3 className="font-bold mb-4 text-fuchsia-700 flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Wallet Transactions
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {walletTxs.length === 0 && (
                <div className="text-center text-muted-foreground">
                  No transactions yet.
                </div>
              )}
              {walletTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-2 border-b pb-2"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <div className="text-sm">+₹{tx.amount}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => setShowWallet(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
