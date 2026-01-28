import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

type RefundRequestStatus = "pending" | "approved" | "rejected";

type RefundRequestRow = {
  id: string;
  driver_id: string;
  amount: number;
  status: RefundRequestStatus;
  requested_by: string | null;
  requested_at: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  driver?: { name?: string | null; phone_number?: string | null; vehicle_number?: string | null };
  requester?: { name?: string | null };
  reviewer?: { name?: string | null };
};

const formatMoney = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const statusBadge = (status: RefundRequestStatus) => {
  switch (status) {
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="pending">Pending</Badge>;
  }
};

export default function RefundRequestsList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RefundRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<RefundRequestStatus | "all">("pending");
  const [search, setSearch] = useState("");

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [selected, setSelected] = useState<RefundRequestRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("driver_refund_requests")
        .select(
          `
          id,
          driver_id,
          amount,
          status,
          requested_by,
          requested_at,
          notes,
          reviewed_by,
          reviewed_at,
          review_notes,
          driver:driver_id ( name, phone_number, vehicle_number ),
          requester:requested_by ( name ),
          reviewer:reviewed_by ( name )
        `
        )
        .order("requested_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setRows((data as any) || []);
    } catch (e) {
      console.error("Error loading refund requests:", e);
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const driverName = (r.driver?.name || "").toLowerCase();
      const phone = (r.driver?.phone_number || "").toLowerCase();
      const vehicle = (r.driver?.vehicle_number || "").toLowerCase();
      return driverName.includes(q) || phone.includes(q) || vehicle.includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const openReview = (row: RefundRequestRow, action: "approve" | "reject") => {
    setSelected(row);
    setReviewAction(action);
    setReviewNotes("");
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!user?.id || !selected) return;
    try {
      setSaving(true);
      const nextStatus: RefundRequestStatus = reviewAction === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("driver_refund_requests")
        .update({
          status: nextStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes.trim() || null,
        })
        .eq("id", selected.id)
        .eq("status", "pending");

      if (error) throw error;
      toast.success(`Request ${nextStatus}`);
      setReviewModalOpen(false);
      setSelected(null);
      await fetchRequests();
    } catch (e) {
      console.error("Error reviewing request:", e);
      toast.error("Failed to update request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Refund Requests (R&F)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rr-search">Search</Label>
              <Input
                id="rr-search"
                placeholder="Driver name / phone / vehicle / request id"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchRequests} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.driver?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.driver?.phone_number || "—"} • {r.driver?.vehicle_number || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-700">{formatMoney(r.amount)}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm">
                        <div>{format(new Date(r.requested_at), "dd MMM yyyy")}</div>
                        <div className="text-xs text-muted-foreground">
                          by {r.requester?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.notes || "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReview(r, "reject")}
                            >
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => openReview(r, "approve")}>
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {r.reviewed_at
                              ? `Reviewed ${format(new Date(r.reviewed_at), "dd MMM yyyy")}`
                              : "Reviewed"}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? "Approve" : "Reject"} refund request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="font-medium">{selected?.driver?.name || "Unknown"}</div>
              <div className="text-muted-foreground">
                Amount: <span className="font-semibold text-green-700">{formatMoney(selected?.amount || 0)}</span>
              </div>
              {selected?.notes && <div className="text-muted-foreground mt-1">Request notes: {selected.notes}</div>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="review-notes">Review notes (optional)</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder={reviewAction === "approve" ? "Approved..." : "Reason for rejection..."}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submitReview} disabled={saving}>
                {saving ? "Saving..." : reviewAction === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

