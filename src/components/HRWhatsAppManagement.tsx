import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Phone,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  status?: string;
  assigned_staff_user_id?: string;
  hr_manager_user_id?: string;
  last_contact_date?: string;
  callback_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_staff?: {
    id: string;
    name: string;
    email: string;
  };
}

const HRWhatsAppManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [filteredNumbers, setFilteredNumbers] = useState<WhatsAppNumber[]>([]);

  // Form states
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [showEditNumber, setShowEditNumber] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(
    null
  );

  // File upload states
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  // Form data
  const [newNumber, setNewNumber] = useState({
    phone_number: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");

  // Bulk operations states
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Staff selection states
  const [availableStaff, setAvailableStaff] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  useEffect(() => {
    fetchWhatsappNumbers();
    fetchAvailableStaff();
  }, []);

  useEffect(() => {
    filterNumbers();
  }, [whatsappNumbers, searchTerm]);

  const fetchWhatsappNumbers = async () => {
    setLoading(true);
    try {
      // First fetch WhatsApp numbers
      const { data: numbersData, error: numbersError } = await supabase
        .from("hr_whatsapp_numbers")
        .select("*")
        .eq("hr_manager_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (numbersError) throw numbersError;

      // Then fetch staff information for assigned numbers
      const numbersWithStaff = await Promise.all(
        (numbersData || []).map(async (number) => {
          if (number.assigned_staff_user_id) {
            try {
              const { data: staffData, error: staffError } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("id", number.assigned_staff_user_id)
                .single();

              if (!staffError && staffData) {
                return {
                  ...number,
                  assigned_staff: staffData,
                };
              } else {
                console.error("Error fetching staff data:", staffError);
                // Return with a fallback staff object
                return {
                  ...number,
                  assigned_staff: {
                    id: number.assigned_staff_user_id,
                    name: "Unknown Staff",
                    email: "unknown@example.com",
                  },
                };
              }
            } catch (error) {
              console.error("Error fetching staff info:", error);
              // Return with a fallback staff object
              return {
                ...number,
                assigned_staff: {
                  id: number.assigned_staff_user_id,
                  name: "Unknown Staff",
                  email: "unknown@example.com",
                },
              };
            }
          }
          return {
            ...number,
            assigned_staff: null,
          };
        })
      );

      setWhatsappNumbers(numbersWithStaff);
    } catch (error) {
      console.error("Error fetching WhatsApp numbers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterNumbers = () => {
    let filtered = [...whatsappNumbers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (number) =>
          number.phone_number.includes(searchTerm) ||
          (number.assigned_staff &&
            (number.assigned_staff.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
              number.assigned_staff.email
                .toLowerCase()
                .includes(searchTerm.toLowerCase())))
      );
    }

    setFilteredNumbers(filtered);
  };

  const addWhatsappNumber = async () => {
    if (!newNumber.phone_number) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hr_whatsapp_numbers")
        .insert([
          {
            phone_number: newNumber.phone_number,
            hr_manager_user_id: user?.id,
          },
        ])
        .select();

      if (error) throw error;

      setNewNumber({ phone_number: "" });
      setShowAddNumber(false);
      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error adding WhatsApp number:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateWhatsappNumber = async () => {
    if (!editingNumber) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .update({
          phone_number: editingNumber.phone_number,
        })
        .eq("id", editingNumber.id);

      if (error) throw error;

      setEditingNumber(null);
      setShowEditNumber(false);
      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error updating WhatsApp number:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNumberStatus = async (
    numberId: string,
    currentStatus: boolean
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .update({ is_active: !currentStatus })
        .eq("id", numberId);

      if (error) throw error;

      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error toggling number status:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteWhatsappNumber = async (numberId: string) => {
    if (!confirm("Are you sure you want to delete this WhatsApp number?"))
      return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .delete()
        .eq("id", numberId);

      if (error) throw error;

      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error deleting WhatsApp number:", error);
    } finally {
      setLoading(false);
    }
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "text/plain",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (
        allowedTypes.includes(file.type) ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv")
      ) {
        setSelectedFile(file);
      } else {
        alert("Please select a valid file (TXT, CSV, or Excel)");
      }
    }
  };

  const parsePhoneNumbers = (content: string): string[] => {
    console.log("Parsing phone numbers from content:", content);

    // Split content by newlines and commas to get individual entries
    const lines = content
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter(Boolean);

    console.log("Total lines found:", lines.length);

    const cleanedNumbers = lines
      .map((line) => {
        // Remove all non-digit characters
        let cleaned = line.replace(/\D/g, "");
        console.log("Cleaned digits:", cleaned);

        // Handle different formats
        if (cleaned.startsWith("91") && cleaned.length === 12) {
          // Has 91 prefix (e.g., 919876543210)
          return "+91" + cleaned.slice(2);
        } else if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
          // 10 digit number starting with 6-9 (e.g., 9876543210)
          return "+91" + cleaned;
        } else if (cleaned.length === 11 && /^[6-9]/.test(cleaned)) {
          // 11 digit number starting with 6-9 (e.g., 71554996650)
          // Take last 10 digits
          const last10 = cleaned.slice(-10);
          if (/^[6-9]/.test(last10)) {
            return "+91" + last10;
          }
        } else if (cleaned.length === 13 && cleaned.startsWith("91")) {
          // 13 digit with 91 prefix (e.g., 919876543210)
          return "+91" + cleaned.slice(2);
        }

        // If it doesn't match any pattern, return empty to filter out
        return "";
      })
      .filter((phone) => {
        // Only keep valid formatted numbers
        const isValid =
          phone.length > 0 &&
          phone.startsWith("+91") &&
          phone.length === 13 &&
          /^\+91[6-9]\d{9}$/.test(phone);
        console.log("Phone validation:", phone, "isValid:", isValid);
        return isValid;
      });

    console.log("Final cleaned numbers:", cleanedNumbers.length, "numbers");

    // Remove duplicates
    const uniqueNumbers = [...new Set(cleanedNumbers)];
    console.log("Unique numbers:", uniqueNumbers.length, "numbers");

    return uniqueNumbers;
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const content = await selectedFile.text();
      console.log("File content:", content);

      const phoneNumbers = parsePhoneNumbers(content);
      console.log("Parsed phone numbers:", phoneNumbers);

      if (phoneNumbers.length === 0) {
        alert("No valid phone numbers found in the file");
        setIsUploading(false);
        return;
      }

      // Get staff assignments for auto-assignment
      const { data: staffAssignments } = await supabase
        .from("hr_staff_assignments")
        .select("hr_staff_user_id")
        .eq("hr_manager_user_id", user?.id)
        .eq("is_active", true);

      if (!staffAssignments || staffAssignments.length === 0) {
        alert("No staff members assigned. Please assign staff members first.");
        setIsUploading(false);
        return;
      }

      // Count existing WhatsApp numbers for each staff member
      const staffCounts: Record<string, number> = {};
      for (const assignment of staffAssignments) {
        const { count } = await supabase
          .from("hr_whatsapp_numbers")
          .select("*", { count: "exact", head: true })
          .eq("assigned_staff_user_id", assignment.hr_staff_user_id)
          .in("status", ["new", "contacted", "responded", "callback"]);
        staffCounts[assignment.hr_staff_user_id] = count || 0;
      }

      const sortedStaff = Object.entries(staffCounts).sort(
        ([, a], [, b]) => a - b
      );
      const defaultStaffId =
        sortedStaff.length > 0
          ? sortedStaff[0][0]
          : staffAssignments[0].hr_staff_user_id;

      let successCount = 0;
      const errors: string[] = [];

      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);
        const batchData = batch.map((phone, index) => {
          const staffIndex = (i + index) % staffAssignments.length;
          const assignedStaffId = staffAssignments[staffIndex].hr_staff_user_id;

          return {
            phone_number: phone,
            status: "new",
            assigned_staff_user_id: assignedStaffId,
            hr_manager_user_id: user?.id,
          };
        });

        const { error } = await supabase
          .from("hr_whatsapp_numbers")
          .insert(batchData);

        if (error) {
          errors.push(
            `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`
          );
        } else {
          successCount += batch.length;
        }

        setUploadProgress(
          Math.round(((i + batch.length) / phoneNumbers.length) * 100)
        );
      }

      setUploadResults({
        success: successCount,
        errors,
      });

      if (successCount > 0) {
        await fetchWhatsappNumbers();
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadResults({
        success: 0,
        errors: [`File processing error: ${error}`],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetFileUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadResults(null);
    setShowFileUpload(false);
  };

  // Fetch available staff for assignment
  const fetchAvailableStaff = async () => {
    try {
      // First try to get staff from hr_staff_assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("hr_staff_assignments")
        .select(
          `
          hr_staff_user_id,
          staff:hr_staff_user_id(id, name, email)
        `
        )
        .eq("hr_manager_user_id", user?.id)
        .eq("is_active", true);

      if (assignmentsError) {
        console.error("Error fetching staff assignments:", assignmentsError);
        // Fallback: get all HR staff directly
        const { data: staffData, error: staffError } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("role", "hr_staff");

        if (staffError) {
          console.error("Error fetching staff directly:", staffError);
          setAvailableStaff([]);
        } else {
          setAvailableStaff(staffData || []);
        }
      } else {
        const staffList =
          assignmentsData?.map((item) => item.staff).filter(Boolean) || [];
        setAvailableStaff(staffList);
      }
    } catch (error) {
      console.error("Error fetching available staff:", error);
      setAvailableStaff([]);
    }
  };

  // Handle number selection
  const handleSelectNumber = (numberId: string) => {
    setSelectedNumbers((prev) =>
      prev.includes(numberId)
        ? prev.filter((id) => id !== numberId)
        : [...prev, numberId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNumbers.length === filteredNumbers.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(filteredNumbers.map((n) => n.id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedNumbers.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .delete()
        .in("id", selectedNumbers);

      if (error) throw error;

      setSelectedNumbers([]);
      setShowBulkDelete(false);
      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error deleting WhatsApp numbers:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async () => {
    if (selectedNumbers.length === 0 || !selectedStaffId) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from("hr_whatsapp_numbers")
        .update({ assigned_staff_user_id: selectedStaffId })
        .in("id", selectedNumbers);

      if (error) throw error;

      setSelectedNumbers([]);
      setSelectedStaffId("");
      setShowBulkAssign(false);
      await fetchWhatsappNumbers();
    } catch (error) {
      console.error("Error assigning WhatsApp numbers:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading && whatsappNumbers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fleet-purple">
            WhatsApp Numbers
          </h1>
          <p className="text-gray-600">
            Manage inquiry phone numbers for HR leads
          </p>
        </div>
        <div className="flex gap-2">
          {selectedNumbers.length > 0 && (
            <>
              <Button
                onClick={() => setShowBulkAssign(true)}
                variant="outline"
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <User className="w-4 h-4" />
                Assign ({selectedNumbers.length})
              </Button>
              <Button
                onClick={() => setShowBulkDelete(true)}
                variant="outline"
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedNumbers.length})
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowFileUpload(true)}
            variant="outline"
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <Upload className="w-4 h-4" />
            Upload Numbers
          </Button>
          <Button
            onClick={() => setShowAddNumber(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Number
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Numbers
                </p>
                <p className="text-2xl font-bold text-fleet-purple">
                  {whatsappNumbers.length}
                </p>
              </div>
              <Phone className="w-8 h-8 text-fleet-purple" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Numbers
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {whatsappNumbers.filter((n) => n.is_active).length}
                </p>
              </div>
              <ToggleRight className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Inactive Numbers
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {whatsappNumbers.filter((n) => !n.is_active).length}
                </p>
              </div>
              <ToggleLeft className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Numbers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by phone number or staff name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                disabled={!searchTerm}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Numbers Table */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Numbers ({filteredNumbers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No WhatsApp numbers added yet</p>
              <p className="text-sm text-gray-400">
                Click "Add Number" to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedNumbers.length === filteredNumbers.length &&
                          filteredNumbers.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Assigned Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNumbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedNumbers.includes(number.id)}
                          onCheckedChange={() => handleSelectNumber(number.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {number.phone_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {number.assigned_staff ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {number.assigned_staff.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {number.assigned_staff.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {number.assigned_staff.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            number.status === "new"
                              ? "secondary"
                              : number.status === "contacted"
                              ? "default"
                              : number.status === "responded"
                              ? "default"
                              : number.status === "converted"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            number.status === "new"
                              ? "bg-blue-100 text-blue-800"
                              : number.status === "contacted"
                              ? "bg-yellow-100 text-yellow-800"
                              : number.status === "responded"
                              ? "bg-green-100 text-green-800"
                              : number.status === "converted"
                              ? "bg-emerald-100 text-emerald-800"
                              : number.status === "not_interested"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {number.status
                            ? number.status.replace("_", " ").toUpperCase()
                            : "NEW"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(number.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(number.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleNumberStatus(number.id, number.is_active)
                            }
                            disabled={loading}
                          >
                            {number.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNumber(number);
                              setShowEditNumber(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deleteWhatsappNumber(number.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Number Dialog */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
            <p className="text-sm text-gray-600">
              Enter a phone number for WhatsApp inquiries
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="number-phone">Phone Number *</Label>
              <Input
                id="number-phone"
                value={newNumber.phone_number}
                onChange={(e) =>
                  setNewNumber({ ...newNumber, phone_number: e.target.value })
                }
                placeholder="Enter phone number (e.g., +1234567890)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddNumber(false)}>
                Cancel
              </Button>
              <Button onClick={addWhatsappNumber} disabled={loading}>
                Add Number
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Number Dialog */}
      <Dialog open={showEditNumber} onOpenChange={setShowEditNumber}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit WhatsApp Number</DialogTitle>
            <p className="text-sm text-gray-600">Update the phone number</p>
          </DialogHeader>
          {editingNumber && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-number-phone">Phone Number *</Label>
                <Input
                  id="edit-number-phone"
                  value={editingNumber.phone_number}
                  onChange={(e) =>
                    setEditingNumber({
                      ...editingNumber,
                      phone_number: e.target.value,
                    })
                  }
                  placeholder="Enter phone number (e.g., +1234567890)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditNumber(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateWhatsappNumber} disabled={loading}>
                  Update Number
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-600" />
              Upload WhatsApp Numbers from File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <p className="text-sm text-gray-500">
                Supported formats: TXT, CSV, Excel files containing phone
                numbers
              </p>
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-green-600">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading WhatsApp numbers...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {uploadResults.success > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {uploadResults.success > 0
                      ? `Successfully uploaded ${uploadResults.success} WhatsApp numbers`
                      : "Upload failed"}
                  </span>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <p
                          key={index}
                          className="text-xs text-red-600 bg-red-50 p-2 rounded"
                        >
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Upload a file containing phone numbers (one per line)</li>
                <li>
                  • Numbers will be automatically distributed to your assigned
                  staff
                </li>
                <li>• Supported formats: TXT, CSV, Excel files</li>
                <li>
                  • Phone numbers will be automatically formatted and validated
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetFileUpload}
              disabled={isUploading}
            >
              {uploadResults ? "Close" : "Cancel"}
            </Button>
            {!uploadResults && (
              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || isUploading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? "Uploading..." : "Upload & Create Numbers"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WhatsApp Numbers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNumbers.length} WhatsApp
              number(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign WhatsApp Numbers</DialogTitle>
            <p className="text-sm text-gray-600">
              Assign {selectedNumbers.length} WhatsApp number(s) to a staff
              member
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="staff-select">Select Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {staff.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-xs text-gray-500">{staff.email}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkAssign(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedStaffId || isAssigning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAssigning ? "Assigning..." : "Assign Numbers"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRWhatsAppManagement;
