import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
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
  Mail,
  Calendar,
  Edit,
  Trash2,
  PhoneCall,
  UserPlus,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash,
  AlertTriangle,
  MessageSquare,
  Download,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  assigned_staff_user_id?: string;
  assigned_manager_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  phone_number: string;
  name?: string;
  role: string;
}

interface LeadStatus {
  id: string;
  name: string;
  display_name: string;
  color: string;
}

const HRLeadsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  // Form states
  const [showAddLead, setShowAddLead] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // File upload states
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  // WhatsApp file upload states
  const [showWhatsAppUpload, setShowWhatsAppUpload] = useState(false);
  const [selectedWhatsAppFile, setSelectedWhatsAppFile] = useState<File | null>(
    null
  );
  const [whatsAppUploadProgress, setWhatsAppUploadProgress] = useState(0);
  const [isWhatsAppUploading, setIsWhatsAppUploading] = useState(false);
  const [whatsAppUploadResults, setWhatsAppUploadResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  // Form data
  const [newLead, setNewLead] = useState({
    phone: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  // Bulk delete states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export states
  const [exportSelectedLeads, setExportSelectedLeads] = useState<Set<string>>(
    new Set()
  );
  const [selectAllForExport, setSelectAllForExport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter, staffFilter]);

  // Reset export selection when filtered leads change
  useEffect(() => {
    setExportSelectedLeads(new Set());
    setSelectAllForExport(false);
  }, [filteredLeads]);

  useEffect(() => {
    const totalPages =
      filteredLeads.length === 0
        ? 1
        : Math.ceil(filteredLeads.length / itemsPerPage);

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredLeads, itemsPerPage, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchLeads(), fetchUsers(), fetchLeadStatuses()]);
    } catch (error) {
      console.error("Error fetching leads data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("hr_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setLeads(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, phone_number, name, role")
      .in("role", ["hr_staff", "hr_manager"])
      .order("phone_number", { ascending: true });

    if (error) throw error;
    setUsers(data || []);
  };

  const fetchLeadStatuses = async () => {
    const { data, error } = await supabase
      .from("hr_lead_statuses")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    setLeadStatuses(data || []);
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((lead) => lead.phone.includes(searchTerm));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    // Staff filter
    if (staffFilter !== "all") {
      filtered = filtered.filter(
        (lead) => lead.assigned_staff_user_id === staffFilter
      );
    }

    setFilteredLeads(filtered);
    setCurrentPage(1);
  };

  const addLead = async () => {
    if (!newLead.phone) return;

    setLoading(true);
    try {
      // Get all active HR staff assignments for this manager (without join)
      const { data: staffAssignments, error: staffError } = await supabase
        .from("hr_staff_assignments")
        .select("hr_staff_user_id")
        .eq("hr_manager_user_id", user?.id)
        .eq("is_active", true);

      if (staffError) {
        console.error("Error fetching staff assignments:", staffError);
        throw staffError;
      }

      let assignedStaffId = null;

      // Get current lead counts for each staff to balance distribution
      if (staffAssignments && staffAssignments.length > 0) {
        const staffCounts: Record<string, number> = {};

        // Count active leads for each staff member
        for (const assignment of staffAssignments) {
          const { count } = await supabase
            .from("hr_leads")
            .select("*", { count: "exact", head: true })
            .eq("assigned_staff_user_id", assignment.hr_staff_user_id)
            .in("status", [
              "new",
              "contacted",
              "hot_lead",
              "cold_lead",
              "callback",
            ]);

          staffCounts[assignment.hr_staff_user_id] = count || 0;
        }

        // Find staff member with least leads for equal distribution
        const sortedStaff = Object.entries(staffCounts).sort(
          ([, a], [, b]) => a - b
        );
        assignedStaffId =
          sortedStaff.length > 0
            ? sortedStaff[0][0]
            : staffAssignments[0].hr_staff_user_id;
      }

      // Insert the new lead with automatic assignment
      const { data, error } = await supabase
        .from("hr_leads")
        .insert([
          {
            name: "Lead", // Default name
            phone: newLead.phone,
            status: "new",
            assigned_manager_user_id: user?.id,
            assigned_staff_user_id: assignedStaffId, // Auto-assign to staff with least leads
          },
        ])
        .select();

      if (error) throw error;

      setNewLead({
        phone: "",
      });
      setShowAddLead(false);
      await fetchLeads();
    } catch (error) {
      console.error("Error adding lead:", error);
      alert(
        "Failed to add lead. Please make sure you have staff members assigned."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async () => {
    if (!editingLead) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_leads")
        .update({
          phone: editingLead.phone,
          status: editingLead.status,
          assigned_staff_user_id: editingLead.assigned_staff_user_id,
        })
        .eq("id", editingLead.id);

      if (error) throw error;

      setEditingLead(null);
      setShowEditLead(false);
      await fetchLeads();
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hr_leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;

      await fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setLoading(false);
    }
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "text/plain",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (
        !allowedTypes.includes(file.type) &&
        !file.name.endsWith(".txt") &&
        !file.name.endsWith(".csv")
      ) {
        alert("Please select a valid file (TXT, CSV, or Excel file)");
        return;
      }

      setSelectedFile(file);
    }
  };

  const parsePhoneNumbers = (content: string): string[] => {
    // Split content by newlines and commas to get individual entries
    const lines = content
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter(Boolean);

    console.log("Total lines found:", lines.length); // Debug log

    // Clean and format phone numbers
    const cleanedNumbers = lines
      .map((line) => {
        console.log("Processing line:", line); // Debug log

        // Remove all non-digit characters
        let cleaned = line.replace(/\D/g, "");

        console.log("Cleaned digits:", cleaned); // Debug log

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
        console.log("Phone validation:", phone, "isValid:", isValid); // Debug log
        return isValid;
      });

    console.log("Final cleaned numbers:", cleanedNumbers.length, "numbers"); // Debug log

    // Remove duplicates
    const uniqueNumbers = [...new Set(cleanedNumbers)];
    console.log("Unique numbers:", uniqueNumbers.length, "numbers"); // Debug log

    return uniqueNumbers;
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const content = await selectedFile.text();
      console.log("File content:", content); // Debug log

      const phoneNumbers = parsePhoneNumbers(content);
      console.log("Parsed phone numbers:", phoneNumbers); // Debug log

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

      // Count existing leads for each staff member
      const staffCounts: Record<string, number> = {};
      for (const assignment of staffAssignments) {
        const { count } = await supabase
          .from("hr_leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_staff_user_id", assignment.hr_staff_user_id)
          .in("status", [
            "new",
            "contacted",
            "hot_lead",
            "cold_lead",
            "callback",
          ]);
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
      let currentStaffIndex = 0;

      // Process phone numbers in batches
      const batchSize = 10;
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);

        // Prepare batch data
        const batchData = batch.map((phone) => {
          // Rotate through staff members for equal distribution
          const staffId =
            staffAssignments[currentStaffIndex % staffAssignments.length]
              .hr_staff_user_id;
          currentStaffIndex++;

          return {
            name: "Lead",
            phone: phone,
            status: "new",
            assigned_manager_user_id: user?.id,
            assigned_staff_user_id: staffId,
          };
        });

        try {
          const { error } = await supabase.from("hr_leads").insert(batchData);

          if (error) {
            errors.push(
              `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`
            );
          } else {
            successCount += batch.length;
          }
        } catch (error: any) {
          errors.push(
            `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`
          );
        }

        // Update progress
        setUploadProgress(
          Math.round(((i + batchSize) / phoneNumbers.length) * 100)
        );
      }

      setUploadResults({
        success: successCount,
        errors: errors,
      });

      // Refresh leads list
      await fetchLeads();
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

  // WhatsApp file upload functions
  const handleWhatsAppFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        setSelectedWhatsAppFile(file);
      } else {
        alert("Please select a valid file (TXT, CSV, or Excel)");
      }
    }
  };

  const parseWhatsAppNumbers = (content: string): string[] => {
    console.log("Parsing WhatsApp numbers from content:", content); // Debug log

    // Enhanced regex to handle various phone number formats with spaces
    const phoneRegex = /(\+?91[\s-]?)?[6-9][\d\s-]{8,12}/g;
    const matches = content.match(phoneRegex) || [];

    console.log("Raw matches:", matches); // Debug log

    const cleanedNumbers = matches
      .map((phone) => {
        // Remove all non-digit characters except +
        let cleaned = phone.replace(/[^\d+]/g, "");
        console.log("Cleaned phone:", cleaned); // Debug log

        // Add +91 prefix if not present
        if (!cleaned.startsWith("+91")) {
          if (cleaned.startsWith("91") && cleaned.length === 12) {
            cleaned = "+" + cleaned;
          } else if (cleaned.length === 10) {
            cleaned = "+91" + cleaned;
          } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
            cleaned = "+91" + cleaned.substring(1);
          }
        }

        return cleaned;
      })
      .filter((phone) => {
        // Only keep valid Indian mobile numbers
        const isValid =
          phone.startsWith("+91") &&
          phone.length === 13 &&
          /^\+91[6-9]/.test(phone);
        console.log("Phone validation:", phone, "isValid:", isValid); // Debug log
        return isValid;
      });

    console.log("Final cleaned WhatsApp numbers:", cleanedNumbers); // Debug log

    // Remove duplicates
    return [...new Set(cleanedNumbers)];
  };

  const handleWhatsAppFileUpload = async () => {
    if (!selectedWhatsAppFile) return;

    setIsWhatsAppUploading(true);
    setWhatsAppUploadProgress(0);
    setWhatsAppUploadResults(null);

    try {
      const content = await selectedWhatsAppFile.text();
      console.log("WhatsApp file content:", content); // Debug log

      const phoneNumbers = parseWhatsAppNumbers(content);
      console.log("Parsed WhatsApp numbers:", phoneNumbers); // Debug log

      if (phoneNumbers.length === 0) {
        alert("No valid phone numbers found in the file");
        setIsWhatsAppUploading(false);
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
        setIsWhatsAppUploading(false);
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
            assigned_manager_user_id: user?.id,
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

        setWhatsAppUploadProgress(
          Math.round(((i + batch.length) / phoneNumbers.length) * 100)
        );
      }

      setWhatsAppUploadResults({
        success: successCount,
        errors,
      });

      if (successCount > 0) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error processing WhatsApp file:", error);
      setWhatsAppUploadResults({
        success: 0,
        errors: [`File processing error: ${error}`],
      });
    } finally {
      setIsWhatsAppUploading(false);
    }
  };

  const resetWhatsAppFileUpload = () => {
    setSelectedWhatsAppFile(null);
    setWhatsAppUploadProgress(0);
    setWhatsAppUploadResults(null);
    setShowWhatsAppUpload(false);
  };

  // Test function to validate phone number parsing
  const testPhoneParsing = () => {
    const testContent = `62381 98071
99616 19677
96568 73929
75103 87189
71 50 559 3915
80864 06345
90616 19051
94898 83315
85928 92667
88483 94542`;

    console.log("Testing phone parsing with sample data:");
    const result = parsePhoneNumbers(testContent);
    console.log("Test result:", result);
    return result;
  };

  // Bulk delete functions
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredLeads.length);
    const currentPageLeads = filteredLeads.slice(start, end);
    const allSelected = currentPageLeads.every((lead) =>
      selectedLeads.includes(lead.id)
    );

    if (allSelected) {
      setSelectedLeads((prev) =>
        prev.filter((id) => !currentPageLeads.some((lead) => lead.id === id))
      );
    } else {
      setSelectedLeads((prev) => {
        const newSelected = new Set(prev);
        currentPageLeads.forEach((lead) => newSelected.add(lead.id));
        return Array.from(newSelected);
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("hr_leads")
        .delete()
        .in("id", selectedLeads);

      if (error) throw error;

      setSelectedLeads([]);
      setShowBulkDelete(false);
      await fetchLeads();
      alert(`Successfully deleted ${selectedLeads.length} leads`);
    } catch (error) {
      console.error("Error deleting leads:", error);
      alert("Failed to delete leads");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("hr_leads")
        .delete()
        .eq("assigned_manager_user_id", user?.id);

      if (error) throw error;

      setSelectedLeads([]);
      setShowDeleteAll(false);
      await fetchLeads();
      alert("Successfully deleted all leads");
    } catch (error) {
      console.error("Error deleting all leads:", error);
      alert("Failed to delete all leads");
    } finally {
      setIsDeleting(false);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.id === userId);
    return user?.name || user?.phone_number || "Unknown";
  };

  const getStatusColor = (status: string) => {
    const statusObj = leadStatuses.find((s) => s.name === status);
    return statusObj?.color || "#6366f1";
  };

  // Export selection handlers
  const handleExportSelectLead = (leadId: string) => {
    const newSelected = new Set(exportSelectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setExportSelectedLeads(newSelected);
    setSelectAllForExport(newSelected.size === filteredLeads.length);
  };

  const handleExportSelectAll = () => {
    if (selectAllForExport) {
      setExportSelectedLeads(new Set());
      setSelectAllForExport(false);
    } else {
      const allIds = new Set(filteredLeads.map((lead) => lead.id));
      setExportSelectedLeads(allIds);
      setSelectAllForExport(true);
    }
  };

  // Export functions
  const exportPhoneNumbers = () => {
    if (exportSelectedLeads.size === 0) {
      toast.error("Please select at least one lead to export");
      return;
    }

    const selectedLeadsData = filteredLeads.filter((lead) =>
      exportSelectedLeads.has(lead.id)
    );
    const phoneNumbers = selectedLeadsData.map((lead) => lead.phone).join("\n");

    // Create and download file
    const blob = new Blob([phoneNumbers], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `phone_numbers_${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(
      `Exported ${exportSelectedLeads.size} phone numbers successfully`
    );
  };

  const exportAsCSV = () => {
    if (exportSelectedLeads.size === 0) {
      toast.error("Please select at least one lead to export");
      return;
    }

    const selectedLeadsData = filteredLeads.filter((lead) =>
      exportSelectedLeads.has(lead.id)
    );
    const csvContent = [
      "Phone Number,Name,Status,Assigned Staff,Assigned Manager,Created Date,Last Updated",
      ...selectedLeadsData.map(
        (lead) =>
          `"${lead.phone}","${lead.name || ""}","${lead.status}","${getUserName(
            lead.assigned_staff_user_id
          )}","${getUserName(lead.assigned_manager_user_id)}","${new Date(
            lead.created_at
          ).toLocaleDateString()}","${new Date(
            lead.updated_at
          ).toLocaleDateString()}"`
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(
      `Exported ${exportSelectedLeads.size} leads as CSV successfully`
    );
  };

  const exportFilteredData = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export with current filters");
      return;
    }

    const csvContent = [
      "Phone Number,Name,Status,Assigned Staff,Assigned Manager,Created Date,Last Updated",
      ...filteredLeads.map(
        (lead) =>
          `"${lead.phone}","${lead.name || ""}","${lead.status}","${getUserName(
            lead.assigned_staff_user_id
          )}","${getUserName(lead.assigned_manager_user_id)}","${new Date(
            lead.created_at
          ).toLocaleDateString()}","${new Date(
            lead.updated_at
          ).toLocaleDateString()}"`
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `filtered_leads_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(
      `Exported ${filteredLeads.length} filtered leads successfully`
    );
  };

  const totalPages =
    filteredLeads.length === 0
      ? 1
      : Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLeads.length);
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
  const pageSelectedCount = paginatedLeads.filter((lead) =>
    selectedLeads.includes(lead.id)
  ).length;
  const isPageFullySelected =
    paginatedLeads.length > 0 && pageSelectedCount === paginatedLeads.length;

  if (loading && leads.length === 0) {
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
            Leads Management
          </h1>
          <p className="text-gray-600">Manage and track HR leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
          <Button
            onClick={() => setShowFileUpload(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
          <Button
            onClick={() => setShowWhatsAppUpload(true)}
            variant="outline"
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <MessageSquare className="w-4 h-4" />
            Upload WhatsApp Numbers
          </Button>
          {selectedLeads.length > 0 && (
            <Button
              onClick={() => setShowBulkDelete(true)}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Delete Selected ({selectedLeads.length})
            </Button>
          )}
          <Button
            onClick={() => setShowDeleteAll(true)}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Leads</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      {status.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="staff-filter">Filter by Staff</Label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {users
                    .filter((u) => u.role === "hr_staff")
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.phone_number}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setStaffFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Controls */}
      {filteredLeads.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllForExport}
                    onChange={handleExportSelectAll}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All for Export ({exportSelectedLeads.size} selected)
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Showing {filteredLeads.length} leads
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={exportPhoneNumbers}
                  disabled={exportSelectedLeads.size === 0}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Phone Numbers
                </Button>
                <Button
                  onClick={exportAsCSV}
                  disabled={exportSelectedLeads.size === 0}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Selected CSV
                </Button>
                <Button
                  onClick={exportFilteredData}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <Download className="w-4 h-4" />
                  Export All Filtered
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
            <div className="text-sm text-gray-500">
              Scroll to view all leads
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 relative border border-gray-200 rounded-lg">
              {/* Scroll indicator at top */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-20"></div>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isPageFullySelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Staff</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {lead.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(lead.status),
                          }}
                          className="text-white"
                        >
                          {leadStatuses.find((s) => s.name === lead.status)
                            ?.display_name || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getUserName(lead.assigned_staff_user_id)}
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingLead(lead);
                              setShowEditLead(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Scroll indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredLeads.length > itemsPerPage && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing{" "}
                {filteredLeads.length === 0
                  ? 0
                  : `${startIndex + 1}-${endIndex}`}{" "}
                of {filteredLeads.length} leads
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, totalPages) },
                      (_, index) => {
                        let pageNumber;

                        if (totalPages <= 5) {
                          pageNumber = index + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + index;
                        } else {
                          pageNumber = currentPage - 2 + index;
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={
                              currentPage === pageNumber ? "default" : "outline"
                            }
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <p className="text-sm text-gray-600">
              Create a new lead for HR tracking
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lead-phone">Phone Number *</Label>
              <Input
                id="lead-phone"
                value={newLead.phone}
                onChange={(e) =>
                  setNewLead({ ...newLead, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddLead(false)}>
                Cancel
              </Button>
              <Button onClick={addLead} disabled={loading}>
                Add Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditLead} onOpenChange={setShowEditLead}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <p className="text-sm text-gray-600">Update lead information</p>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-lead-phone">Phone Number *</Label>
                <Input
                  id="edit-lead-phone"
                  value={editingLead.phone}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-lead-status">Status</Label>
                <Select
                  value={editingLead.status}
                  onValueChange={(value) =>
                    setEditingLead({ ...editingLead, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.name}>
                        {status.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-lead-staff">Assign to Staff</Label>
                <Select
                  value={editingLead.assigned_staff_user_id || "unassigned"}
                  onValueChange={(value) =>
                    setEditingLead({
                      ...editingLead,
                      assigned_staff_user_id:
                        value === "unassigned" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users
                      .filter((u) => u.role === "hr_staff")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.phone_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditLead(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateLead} disabled={loading}>
                  Update Lead
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
              <Upload className="h-5 w-5" />
              Upload Leads from File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select File</Label>
                <div className="mt-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: TXT, CSV, Excel files
                </p>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Selected: {selectedFile.name}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Size: {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Upload Complete!
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Successfully created {uploadResults.success} leads
                  </p>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">
                        {uploadResults.errors.length} errors occurred
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">
                File Format Instructions:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • File should contain phone numbers (one per line or separated
                  by commas)
                </li>
                <li>
                  • Phone numbers can be in formats: 9876543210, +919876543210,
                  91-9876543210
                </li>
                <li>
                  • Indian mobile numbers starting with 6, 7, 8, or 9 are
                  supported
                </li>
                <li>• Duplicate numbers will be automatically filtered out</li>
                <li>• Leads will be automatically assigned to staff members</li>
              </ul>

              {/* Test Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testPhoneParsing}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Test Phone Parsing (Check Console)
                </Button>
              </div>
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? "Uploading..." : "Upload & Create Leads"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp File Upload Dialog */}
      <Dialog open={showWhatsAppUpload} onOpenChange={setShowWhatsAppUpload}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Upload WhatsApp Numbers from File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp-file">Select File</Label>
              <Input
                id="whatsapp-file"
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                onChange={handleWhatsAppFileSelect}
                disabled={isWhatsAppUploading}
              />
              <p className="text-sm text-gray-500">
                Supported formats: TXT, CSV, Excel files containing phone
                numbers
              </p>
            </div>

            {/* Selected File Display */}
            {selectedWhatsAppFile && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {selectedWhatsAppFile.name}
                  </span>
                  <span className="text-xs text-green-600">
                    ({(selectedWhatsAppFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isWhatsAppUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading WhatsApp numbers...</span>
                  <span>{whatsAppUploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${whatsAppUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Results */}
            {whatsAppUploadResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {whatsAppUploadResults.success > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {whatsAppUploadResults.success > 0
                      ? `Successfully uploaded ${whatsAppUploadResults.success} WhatsApp numbers`
                      : "Upload failed"}
                  </span>
                </div>

                {whatsAppUploadResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {whatsAppUploadResults.errors.map((error, index) => (
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
                  • Numbers will be automatically distributed among available
                  staff
                </li>
                <li>
                  • Each staff member will receive an equal number of WhatsApp
                  contacts
                </li>
                <li>• Supported formats: TXT, CSV, Excel files</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetWhatsAppFileUpload}
              disabled={isWhatsAppUploading}
            >
              {whatsAppUploadResults ? "Close" : "Cancel"}
            </Button>
            {!whatsAppUploadResults && (
              <Button
                onClick={handleWhatsAppFileUpload}
                disabled={!selectedWhatsAppFile || isWhatsAppUploading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isWhatsAppUploading
                  ? "Uploading..."
                  : "Upload & Create WhatsApp Numbers"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              Delete Selected Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  Warning: This action cannot be undone
                </span>
              </div>
              <p className="text-sm text-red-600 mt-2">
                You are about to delete {selectedLeads.length} selected leads.
                This action cannot be undone.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• All selected leads will be permanently deleted</p>
              <p>• This action cannot be undone</p>
              <p>• Make sure you have backed up any important data</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "Deleting..."
                : `Delete ${selectedLeads.length} Leads`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete All Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  Danger: This will delete ALL leads
                </span>
              </div>
              <p className="text-sm text-red-600 mt-2">
                You are about to delete ALL leads in the system. This action
                cannot be undone.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• All leads will be permanently deleted</p>
              <p>• This includes leads from all managers</p>
              <p>• This action cannot be undone</p>
              <p>• Make sure you have backed up any important data</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAll(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting All..." : "Delete All Leads"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRLeadsManagement;
