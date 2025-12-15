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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle,
  DollarSign,
  Building2,
  FileText,
  CreditCard,
} from "lucide-react";
import { formatter } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  gst_no?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

interface APInvoice {
  id: string;
  vendor_id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  description?: string;
  vendors: Vendor;
  created_at: string;
}

interface APPayment {
  id: string;
  ap_invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

interface AccountsPayableSectionProps {
  refreshTrigger?: number;
}

const AccountsPayableSection = ({
  refreshTrigger,
}: AccountsPayableSectionProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [payments, setPayments] = useState<APPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  const [isAddInvoiceDialogOpen, setIsAddInvoiceDialogOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(
    null
  );
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [paymentDate, setPaymentDate] = useState(new Date());

  const [vendorFormData, setVendorFormData] = useState({
    name: "",
    gst_no: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    is_active: true,
  });

  const [invoiceFormData, setInvoiceFormData] = useState({
    vendor_id: "",
    invoice_no: "",
    invoice_date: new Date(),
    due_date: new Date(),
    amount: "",
    tax_rate: "",
    description: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    ap_invoice_id: "",
    payment_date: new Date(),
    amount: "",
    payment_method: "bank_transfer",
    reference: "",
    notes: "",
  });

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("ap_invoices")
        .select(
          `
          *,
          vendors (*)
        `
        )
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("ap_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchVendors(), fetchInvoices(), fetchPayments()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger]);

  const handleVendorInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setVendorFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleInvoiceInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setInvoiceFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "vendor_id") {
      setInvoiceFormData((prev) => ({ ...prev, [name]: value }));
    } else if (name === "ap_invoice_id") {
      setPaymentFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleInvoiceDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setInvoiceDate(selectedDate);
      setInvoiceFormData((prev) => ({ ...prev, invoice_date: selectedDate }));
    }
  };

  const handleDueDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDueDate(selectedDate);
      setInvoiceFormData((prev) => ({ ...prev, due_date: selectedDate }));
    }
  };

  const handlePaymentDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setPaymentDate(selectedDate);
      setPaymentFormData((prev) => ({ ...prev, payment_date: selectedDate }));
    }
  };

  const handleAddVendor = async () => {
    try {
      if (!vendorFormData.name) {
        toast.error("Please fill all required fields");
        return;
      }

      const { error } = await supabase.from("vendors").insert([vendorFormData]);

      if (error) throw error;

      toast.success("Vendor added successfully");
      fetchVendors();
      setIsAddVendorDialogOpen(false);
      resetVendorForm();
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor");
    }
  };

  const handleAddInvoice = async () => {
    try {
      if (
        !invoiceFormData.vendor_id ||
        !invoiceFormData.invoice_no ||
        !invoiceFormData.amount
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const amount = parseFloat(invoiceFormData.amount);
      const taxRate = parseFloat(invoiceFormData.tax_rate) || 0;
      const taxAmount = (amount * taxRate) / 100;
      const totalAmount = amount + taxAmount;

      const { error } = await supabase.from("ap_invoices").insert([
        {
          vendor_id: invoiceFormData.vendor_id,
          invoice_no: invoiceFormData.invoice_no,
          invoice_date: invoiceFormData.invoice_date
            .toISOString()
            .split("T")[0],
          due_date: invoiceFormData.due_date.toISOString().split("T")[0],
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          description: invoiceFormData.description,
          status: "pending",
        },
      ]);

      if (error) throw error;

      toast.success("Invoice added successfully");
      fetchInvoices();
      setIsAddInvoiceDialogOpen(false);
      resetInvoiceForm();
    } catch (error) {
      console.error("Error adding invoice:", error);
      toast.error("Failed to add invoice");
    }
  };

  const handleAddPayment = async () => {
    try {
      if (!paymentFormData.ap_invoice_id || !paymentFormData.amount) {
        toast.error("Please fill all required fields");
        return;
      }

      const { error } = await supabase.from("ap_payments").insert([
        {
          ap_invoice_id: paymentFormData.ap_invoice_id,
          payment_date: paymentFormData.payment_date
            .toISOString()
            .split("T")[0],
          amount: parseFloat(paymentFormData.amount),
          payment_method: paymentFormData.payment_method,
          reference: paymentFormData.reference,
          notes: paymentFormData.notes,
        },
      ]);

      if (error) throw error;

      // Update invoice status to paid
      await supabase
        .from("ap_invoices")
        .update({ status: "paid" })
        .eq("id", paymentFormData.ap_invoice_id);

      toast.success("Payment recorded successfully");
      fetchPayments();
      fetchInvoices();
      setIsAddPaymentDialogOpen(false);
      resetPaymentForm();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from("ap_invoices")
        .update({ status: "approved" })
        .eq("id", invoiceId);

      if (error) throw error;

      toast.success("Invoice approved successfully");
      fetchInvoices();
    } catch (error) {
      console.error("Error approving invoice:", error);
      toast.error("Failed to approve invoice");
    }
  };

  const resetVendorForm = () => {
    setVendorFormData({
      name: "",
      gst_no: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      is_active: true,
    });
  };

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      vendor_id: "",
      invoice_no: "",
      invoice_date: new Date(),
      due_date: new Date(),
      amount: "",
      tax_rate: "",
      description: "",
    });
    setInvoiceDate(new Date());
    setDueDate(new Date());
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      ap_invoice_id: "",
      payment_date: new Date(),
      amount: "",
      payment_method: "bank_transfer",
      reference: "",
      notes: "",
    });
    setPaymentDate(new Date());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return (
          <Badge variant="default" className="bg-blue-500">
            Approved
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500">
            Paid
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />;
      case "cash":
        return <DollarSign className="h-4 w-4" />;
      case "cheque":
        return <FileText className="h-4 w-4" />;
      case "card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const calculateTotals = () => {
    const totalPending = invoices
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const totalOverdue = invoices
      .filter((inv) => inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return { totalPending, totalOverdue, totalPaid };
  };

  const { totalPending, totalOverdue, totalPaid } = calculateTotals();

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
          <h2 className="text-3xl font-bold">Accounts Payable</h2>
          <p className="text-muted-foreground">
            Manage vendor invoices and payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Pending Invoices
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              Overdue Invoices
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vendor Invoices</CardTitle>
                  <CardDescription>
                    All vendor invoices and their payment status
                  </CardDescription>
                </div>
                <Dialog
                  open={isAddInvoiceDialogOpen}
                  onOpenChange={setIsAddInvoiceDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Invoice</DialogTitle>
                      <DialogDescription>
                        Record a new vendor invoice.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor_id">Vendor</Label>
                          <Select
                            value={invoiceFormData.vendor_id}
                            onValueChange={(value) =>
                              handleSelectChange("vendor_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invoice_no">Invoice No</Label>
                          <Input
                            id="invoice_no"
                            name="invoice_no"
                            value={invoiceFormData.invoice_no}
                            onChange={handleInvoiceInputChange}
                            placeholder="Invoice number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Invoice Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {invoiceDate ? (
                                  format(invoiceDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={invoiceDate}
                                onSelect={handleInvoiceDateSelect}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dueDate ? (
                                  format(dueDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={dueDate}
                                onSelect={handleDueDateSelect}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={invoiceFormData.amount}
                            onChange={handleInvoiceInputChange}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                          <Input
                            id="tax_rate"
                            name="tax_rate"
                            type="number"
                            step="0.01"
                            value={invoiceFormData.tax_rate}
                            onChange={handleInvoiceInputChange}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={invoiceFormData.description}
                          onChange={handleInvoiceInputChange}
                          placeholder="Invoice description"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddInvoiceDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddInvoice}
                        className="bg-fleet-purple hover:bg-fleet-purple-dark"
                      >
                        Add Invoice
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_no}
                        </TableCell>
                        <TableCell>{invoice.vendors.name}</TableCell>
                        <TableCell>
                          {format(
                            new Date(invoice.invoice_date),
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatter.format(invoice.total_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {invoice.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveInvoice(invoice.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            {invoice.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentFormData((prev) => ({
                                    ...prev,
                                    ap_invoice_id: invoice.id,
                                    amount: invoice.total_amount.toString(),
                                  }));
                                  setIsAddPaymentDialogOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <DollarSign className="mr-1 h-4 w-4" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-gray-500 py-8"
                        >
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vendors</CardTitle>
                  <CardDescription>Manage vendor information</CardDescription>
                </div>
                <Dialog
                  open={isAddVendorDialogOpen}
                  onOpenChange={setIsAddVendorDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Vendor</DialogTitle>
                      <DialogDescription>
                        Add a new vendor to your system.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">Vendor Name</Label>
                        <Input
                          id="vendor_name"
                          name="name"
                          value={vendorFormData.name}
                          onChange={handleVendorInputChange}
                          placeholder="Vendor name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gst_no">GST No</Label>
                          <Input
                            id="gst_no"
                            name="gst_no"
                            value={vendorFormData.gst_no}
                            onChange={handleVendorInputChange}
                            placeholder="GST number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact_person">Contact Person</Label>
                          <Input
                            id="contact_person"
                            name="contact_person"
                            value={vendorFormData.contact_person}
                            onChange={handleVendorInputChange}
                            placeholder="Contact person"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={vendorFormData.email}
                            onChange={handleVendorInputChange}
                            placeholder="Email address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={vendorFormData.phone}
                            onChange={handleVendorInputChange}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={vendorFormData.address}
                          onChange={handleVendorInputChange}
                          placeholder="Vendor address"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddVendorDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddVendor}
                        className="bg-fleet-purple hover:bg-fleet-purple-dark"
                      >
                        Add Vendor
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>GST No</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">
                          {vendor.name}
                        </TableCell>
                        <TableCell>{vendor.gst_no || "-"}</TableCell>
                        <TableCell>{vendor.contact_person || "-"}</TableCell>
                        <TableCell>{vendor.email || "-"}</TableCell>
                        <TableCell>{vendor.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={vendor.is_active ? "default" : "secondary"}
                          >
                            {vendor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {vendors.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-gray-500 py-8"
                        >
                          No vendors found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>All vendor payments made</CardDescription>
                </div>
                <Dialog
                  open={isAddPaymentDialogOpen}
                  onOpenChange={setIsAddPaymentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
                      <Plus className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                      <DialogDescription>
                        Record a payment made to a vendor.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="ap_invoice_id">Invoice</Label>
                        <Select
                          value={paymentFormData.ap_invoice_id}
                          onValueChange={(value) =>
                            handleSelectChange("ap_invoice_id", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select invoice" />
                          </SelectTrigger>
                          <SelectContent>
                            {invoices
                              .filter((inv) => inv.status === "approved")
                              .map((invoice) => (
                                <SelectItem key={invoice.id} value={invoice.id}>
                                  {invoice.invoice_no} - {invoice.vendors.name}{" "}
                                  - {formatter.format(invoice.total_amount)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {paymentDate ? (
                                format(paymentDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={paymentDate}
                              onSelect={handlePaymentDateSelect}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_amount">Amount</Label>
                          <Input
                            id="payment_amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={paymentFormData.amount}
                            onChange={handlePaymentInputChange}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment_method">Payment Method</Label>
                          <Select
                            value={paymentFormData.payment_method}
                            onValueChange={(value) =>
                              handleSelectChange("payment_method", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank_transfer">
                                Bank Transfer
                              </SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reference">Reference</Label>
                        <Input
                          id="reference"
                          name="reference"
                          value={paymentFormData.reference}
                          onChange={handlePaymentInputChange}
                          placeholder="Payment reference"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          value={paymentFormData.notes}
                          onChange={handlePaymentInputChange}
                          placeholder="Payment notes"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddPaymentDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddPayment}
                        className="bg-fleet-purple hover:bg-fleet-purple-dark"
                      >
                        Record Payment
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(
                            new Date(payment.payment_date),
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatter.format(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="capitalize">
                              {payment.payment_method.replace("_", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{payment.reference || "-"}</TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))}

                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500 py-8"
                        >
                          No payments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>AP Reports</CardTitle>
              <CardDescription>
                Accounts Payable reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Reports coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountsPayableSection;

