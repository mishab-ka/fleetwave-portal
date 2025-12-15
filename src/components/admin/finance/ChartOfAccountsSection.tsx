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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";

interface Account {
  id: string;
  account_code: string;
  name: string;
  type: string;
  parent_account_id?: string;
  account_level: number;
  account_path: string;
  normal_balance: string;
  is_active: boolean;
  description?: string;
  children?: Account[];
}

interface ChartOfAccountsSectionProps {
  refreshTrigger?: number;
}

const ChartOfAccountsSection = ({
  refreshTrigger,
}: ChartOfAccountsSectionProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );

  const [formData, setFormData] = useState({
    account_code: "",
    name: "",
    type: "",
    parent_account_id: "",
    normal_balance: "",
    description: "",
    is_active: true,
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("account_code");

      if (error) throw error;

      // Build hierarchical structure
      const accountMap = new Map<string, Account>();
      const rootAccounts: Account[] = [];

      // First pass: create account objects
      data?.forEach((account) => {
        accountMap.set(account.id, { ...account, children: [] });
      });

      // Second pass: build hierarchy
      data?.forEach((account) => {
        const accountObj = accountMap.get(account.id)!;
        if (account.parent_account_id) {
          const parent = accountMap.get(account.parent_account_id);
          if (parent) {
            parent.children!.push(accountObj);
          }
        } else {
          rootAccounts.push(accountObj);
        }
      });

      setAccounts(rootAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchAccounts();
    }
  }, [refreshTrigger]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddAccount = async () => {
    try {
      if (
        !formData.account_code ||
        !formData.name ||
        !formData.type ||
        !formData.normal_balance
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const { error } = await supabase.from("accounts").insert([
        {
          account_code: formData.account_code,
          name: formData.name,
          type: formData.type,
          parent_account_id: formData.parent_account_id || null,
          normal_balance: formData.normal_balance,
          description: formData.description || null,
          is_active: formData.is_active,
        },
      ]);

      if (error) throw error;

      toast.success("Account added successfully");
      fetchAccounts();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account");
    }
  };

  const handleEditAccount = async () => {
    try {
      if (
        !selectedAccount ||
        !formData.account_code ||
        !formData.name ||
        !formData.type ||
        !formData.normal_balance
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const { error } = await supabase
        .from("accounts")
        .update({
          account_code: formData.account_code,
          name: formData.name,
          type: formData.type,
          parent_account_id: formData.parent_account_id || null,
          normal_balance: formData.normal_balance,
          description: formData.description || null,
          is_active: formData.is_active,
        })
        .eq("id", selectedAccount.id);

      if (error) throw error;

      toast.success("Account updated successfully");
      fetchAccounts();
      setIsEditDialogOpen(false);
      setSelectedAccount(null);
      resetForm();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase.from("accounts").delete().eq("id", id);

      if (error) throw error;

      toast.success("Account deleted successfully");
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleEditClick = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      account_code: account.account_code,
      name: account.name,
      type: account.type,
      parent_account_id: account.parent_account_id || "",
      normal_balance: account.normal_balance,
      description: account.description || "",
      is_active: account.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const toggleExpanded = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setFormData({
      account_code: "",
      name: "",
      type: "",
      parent_account_id: "",
      normal_balance: "",
      description: "",
      is_active: true,
    });
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "Asset":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case "Liability":
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case "Equity":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Income":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "Expense":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "Asset":
        return "bg-blue-100 text-blue-800";
      case "Liability":
        return "bg-red-100 text-red-800";
      case "Equity":
        return "bg-green-100 text-green-800";
      case "Income":
        return "bg-green-100 text-green-800";
      case "Expense":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderAccountRow = (account: Account, level: number = 0) => {
    const isExpanded = expandedAccounts.has(account.id);
    const hasChildren = account.children && account.children.length > 0;

    return (
      <>
        <TableRow className="hover:bg-gray-50" key={account.id}>
          <TableCell style={{ paddingLeft: `${level * 20 + 12}px` }}>
            <div className="flex items-center space-x-2">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(account.id)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              <div className="flex items-center space-x-2">
                {getAccountTypeIcon(account.type)}
                <span className="font-medium">{account.account_code}</span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <span>{account.name}</span>
              {!account.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge className={getAccountTypeColor(account.type)}>
              {account.type}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{account.normal_balance}</Badge>
          </TableCell>
          <TableCell>{account.description || "-"}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(account)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAccount(account.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {isExpanded &&
          hasChildren &&
          account.children!.map((child) => renderAccountRow(child, level + 1))}
      </>
    );
  };

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
          <h2 className="text-3xl font-bold">Chart of Accounts</h2>
          <p className="text-muted-foreground">
            Manage your accounting structure with hierarchical account
            organization
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fleet-purple hover:bg-fleet-purple-dark">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new account in your chart of accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_code">Account Code</Label>
                  <Input
                    id="account_code"
                    name="account_code"
                    value={formData.account_code}
                    onChange={handleInputChange}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Cash and Bank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal_balance">Normal Balance</Label>
                  <Select
                    value={formData.normal_balance}
                    onValueChange={(value) =>
                      handleSelectChange("normal_balance", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select balance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Debit">Debit</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_account_id">
                  Parent Account (Optional)
                </Label>
                <Select
                  value={formData.parent_account_id}
                  onValueChange={(value) =>
                    handleSelectChange("parent_account_id", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (Main account)</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Account description"
                />
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
                onClick={handleAddAccount}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>Update the account details.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_account_code">Account Code</Label>
                  <Input
                    id="edit_account_code"
                    name="account_code"
                    value={formData.account_code}
                    onChange={handleInputChange}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Account Name</Label>
                  <Input
                    id="edit_name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Cash and Bank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_type">Account Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_normal_balance">Normal Balance</Label>
                  <Select
                    value={formData.normal_balance}
                    onValueChange={(value) =>
                      handleSelectChange("normal_balance", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select balance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Debit">Debit</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_parent_account_id">
                  Parent Account (Optional)
                </Label>
                <Select
                  value={formData.parent_account_id}
                  onValueChange={(value) =>
                    handleSelectChange("parent_account_id", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (Main account)</SelectItem>
                    {accounts
                      .filter((account) => account.id !== selectedAccount?.id)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Account description"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditAccount}
                className="bg-fleet-purple hover:bg-fleet-purple-dark"
              >
                Update Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
          <CardDescription>
            Hierarchical view of all accounts in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => renderAccountRow(account))}

                {accounts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500 py-8"
                    >
                      No accounts found
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

export default ChartOfAccountsSection;
