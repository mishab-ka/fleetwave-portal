import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  CalendarIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calculator,
  FileText,
} from "lucide-react";
import { formatter } from "@/lib/utils";

interface Account {
  id: string;
  account_code: string;
  name: string;
  type: string;
  normal_balance: string;
  account_path: string;
}

interface JournalEntry {
  id: string;
  journal_no: string;
  date: string;
  description: string;
  reference_no?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  journal_lines: JournalLine[];
}

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  accounts: Account;
}

interface JournalEntriesSectionProps {
  refreshTrigger?: number;
}

const JournalEntriesSection = ({
  refreshTrigger,
}: JournalEntriesSectionProps) => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryDate, setEntryDate] = useState(new Date());

  const [formData, setFormData] = useState({
    description: "",
    reference_no: "",
    date: new Date(),
    journal_lines: [
      { account_id: "", description: "", debit: 0, credit: 0 },
      { account_id: "", description: "", debit: 0, credit: 0 },
    ],
  });

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          `
          *,
          journal_lines (
            *,
            accounts (*)
          )
        `
        )
        .order("date", { ascending: false });

      if (error) throw error;

      setJournalEntries(data || []);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_code");

      if (error) throw error;

      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts");
    }
  };

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchJournalEntries();
    }
  }, [refreshTrigger]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
      setFormData((prev) => ({
        ...prev,
        date: selectedDate,
      }));
    }
  };

  const handleLineChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      journal_lines: prev.journal_lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const addJournalLine = () => {
    setFormData((prev) => ({
      ...prev,
      journal_lines: [
        ...prev.journal_lines,
        { account_id: "", description: "", debit: 0, credit: 0 },
      ],
    }));
  };

  const removeJournalLine = (index: number) => {
    if (formData.journal_lines.length > 2) {
      setFormData((prev) => ({
        ...prev,
        journal_lines: prev.journal_lines.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateTotals = () => {
    const totalDebit = formData.journal_lines.reduce(
      (sum, line) => sum + (line.debit || 0),
      0
    );
    const totalCredit = formData.journal_lines.reduce(
      (sum, line) => sum + (line.credit || 0),
      0
    );
    return { totalDebit, totalCredit };
  };

  const isBalanced = () => {
    const { totalDebit, totalCredit } = calculateTotals();
    return Math.abs(totalDebit - totalCredit) < 0.01;
  };

  const generateJournalNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-4);
    return `JE${year}${month}${day}${timestamp}`;
  };

  const handleAddEntry = async () => {
    try {
      if (!formData.description || !isBalanced()) {
        toast.error(
          "Please ensure all fields are filled and debits equal credits"
        );
        return;
      }

      const { totalDebit, totalCredit } = calculateTotals();
      const journalNo = generateJournalNumber();

      // Create journal entry
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .insert([
          {
            journal_no: journalNo,
            date: formData.date.toISOString().split("T")[0],
            description: formData.description,
            reference_no: formData.reference_no || null,
            total_debit: totalDebit,
            total_credit: totalCredit,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal lines
      const journalLines = formData.journal_lines
        .filter(
          (line) => line.account_id && (line.debit > 0 || line.credit > 0)
        )
        .map((line) => ({
          journal_entry_id: entryData.id,
          account_id: line.account_id,
          description: line.description,
          debit: line.debit || 0,
          credit: line.credit || 0,
        }));

      if (journalLines.length > 0) {
        const { error: linesError } = await supabase
          .from("journal_lines")
          .insert(journalLines);

        if (linesError) throw linesError;
      }

      toast.success("Journal entry created successfully");
      fetchJournalEntries();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating journal entry:", error);
      toast.error("Failed to create journal entry");
    }
  };

  const handlePostEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({ status: "posted" })
        .eq("id", entryId);

      if (error) throw error;

      toast.success("Journal entry posted successfully");
      fetchJournalEntries();
    } catch (error) {
      console.error("Error posting journal entry:", error);
      toast.error("Failed to post journal entry");
    }
  };

  const handleReverseEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({ status: "reversed" })
        .eq("id", entryId);

      if (error) throw error;

      toast.success("Journal entry reversed successfully");
      fetchJournalEntries();
    } catch (error) {
      console.error("Error reversing journal entry:", error);
      toast.error("Failed to reverse journal entry");
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      reference_no: "",
      date: new Date(),
      journal_lines: [
        { account_id: "", description: "", debit: 0, credit: 0 },
        { account_id: "", description: "", debit: 0, credit: 0 },
      ],
    });
    setEntryDate(new Date());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "posted":
        return (
          <Badge variant="default" className="bg-green-500">
            Posted
          </Badge>
        );
      case "reversed":
        return <Badge variant="destructive">Reversed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Journal Entries</h2>
          <p className="text-muted-foreground">
            Manage general ledger entries with double-entry bookkeeping
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Journal Entry</DialogTitle>
              <DialogDescription>
                Create a new journal entry with double-entry bookkeeping. Ensure
                debits equal credits.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter journal entry description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_no">Reference No</Label>
                  <Input
                    id="reference_no"
                    name="reference_no"
                    value={formData.reference_no}
                    onChange={handleInputChange}
                    placeholder="Optional reference number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {entryDate ? (
                        format(entryDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={entryDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Journal Lines</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addJournalLine}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.journal_lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={line.account_id}
                              onValueChange={(value) =>
                                handleLineChange(index, "account_id", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((account) => (
                                  <SelectItem
                                    key={account.id}
                                    value={account.id}
                                  >
                                    {account.account_code} - {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Line description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.debit}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  "debit",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.credit}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  "credit",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            {formData.journal_lines.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeJournalLine(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Total Debit: </span>
                    <span
                      className={
                        totalDebit > 0 ? "text-green-600" : "text-gray-500"
                      }
                    >
                      {formatter.format(totalDebit)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Total Credit: </span>
                    <span
                      className={
                        totalCredit > 0 ? "text-green-600" : "text-gray-500"
                      }
                    >
                      {formatter.format(totalCredit)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Difference: </span>
                    <span
                      className={
                        isBalanced() ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatter.format(totalDebit - totalCredit)}
                    </span>
                  </div>
                  {isBalanced() ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={!isBalanced()}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Create Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>
            All journal entries with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journal No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Total Debit</TableHead>
                  <TableHead className="text-right">Total Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.journal_no}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.reference_no || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatter.format(entry.total_debit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatter.format(entry.total_credit)}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {entry.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePostEntry(entry.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Post
                          </Button>
                        )}
                        {entry.status === "posted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReverseEntry(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reverse
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {journalEntries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-8"
                    >
                      No journal entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntriesSection;
