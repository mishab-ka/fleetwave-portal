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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Edit, Trash } from "lucide-react";

type RefundRequestStatus = "pending" | "approved" | "rejected";

type RefundRequestRow = {
  id: string;
  driver_id: string;
  amount: number;
  status: RefundRequestStatus;
  requested_by: string | null;
  requested_at: string;
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

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSelected, setEditSelected] = useState<RefundRequestRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

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

      // If approved, create a P&R transaction to deduct the amount
      if (nextStatus === "approved") {
        // Get current driver penalties
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("total_penalties")
          .eq("id", selected.driver_id)
          .single();

        if (driverError) {
          console.error("Error fetching driver data:", driverError);
        } else {
          const currentPenalties = driverData?.total_penalties || 0;

          // Create a "due" type transaction to deduct from P&R balance
          const { error: txError } = await supabase
            .from("driver_penalty_transactions")
            .insert({
              user_id: selected.driver_id,
              amount: selected.amount,
              type: "due",
              description: `Refund Payout - Request approved${reviewNotes.trim() ? `: ${reviewNotes.trim()}` : ""}`,
              created_by: user.id,
            });

          if (txError) {
            console.error("Error creating P&R transaction:", txError);
            toast.error("Refund approved but failed to create P&R transaction");
          } else {
            // Update driver's total_penalties (due adds to penalties)
            const { error: updateError } = await supabase
              .from("users")
              .update({
                total_penalties: currentPenalties + selected.amount,
              })
              .eq("id", selected.driver_id);

            if (updateError) {
              console.error("Error updating driver penalties:", updateError);
            } else {
              toast.success("Refund approved and deducted from P&R balance");
            }
          }
        }
      } else {
        toast.success(`Request ${nextStatus}`);
      }

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

  // Handle edit refund request
  const openEditModal = (row: RefundRequestRow) => {
    setEditSelected(row);
    setEditAmount(row.amount.toString());
    setEditNotes(row.notes || "");
    setEditModalOpen(true);
  };

  const submitEdit = async () => {
    if (!user?.id || !editSelected) return;
    const amountNum = parseFloat(editAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      setEditSaving(true);
      const { error } = await supabase
        .from("driver_refund_requests")
        .update({
          amount: amountNum,
          notes: editNotes.trim() || null,
        })
        .eq("id", editSelected.id);

      if (error) throw error;
      toast.success("Refund request updated");
      setEditModalOpen(false);
      setEditSelected(null);
      await fetchRequests();
    } catch (e) {
      console.error("Error updating refund request:", e);
      toast.error("Failed to update refund request");
    } finally {
      setEditSaving(false);
    }
  };

  // Handle delete refund request
  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      const { error } = await supabase
        .from("driver_refund_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Refund request deleted");
      await fetchRequests();
    } catch (e) {
      console.error("Error deleting refund request:", e);
      toast.error("Failed to delete refund request");
    } finally {
      setDeleting(false);
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(r)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Refund Request?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this refund request for{" "}
                                    {r.driver?.name || "Unknown"} ({formatMoney(r.amount)}).
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(r.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                    disabled={deleting}
                                  >
                                    {deleting ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                          <div className="flex justify-end gap-2 items-center">
                            <div className="text-xs text-muted-foreground">
                              {r.reviewed_at
                                ? `Reviewed ${format(new Date(r.reviewed_at), "dd MMM yyyy")}`
                                : "Reviewed"}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Refund Request?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this refund request for{" "}
                                    {r.driver?.name || "Unknown"} ({formatMoney(r.amount)}).
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(r.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                    disabled={deleting}
                                  >
                                    {deleting ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
            </div>
            {reviewAction === "approve" && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                <strong>Note:</strong> Approving this request will automatically deduct{" "}
                {formatMoney(selected?.amount || 0)} from the driver's P&R balance.
              </div>
            )}
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

      {/* Edit Refund Request Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Refund Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="font-medium">{editSelected?.driver?.name || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">
                {editSelected?.driver?.phone_number || "—"} • {editSelected?.driver?.vehicle_number || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                min={1}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Any details for the request..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={submitEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

