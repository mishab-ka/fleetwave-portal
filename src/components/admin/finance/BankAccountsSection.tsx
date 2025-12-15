import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Banknote, Plus, DollarSign, CreditCard } from "lucide-react";
import { formatter } from "@/lib/utils";

interface Account {
  id: string;
  account_code: string;
  name: string;
  type: string;
  balance: number;
  normal_balance: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

const BankAccountsSection = () => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "Asset",
    balance: 0,
    account_code: "",
    normal_balance: "Debit",
    description: "",
  });

  const generateAccountCode = async (type: string): Promise<string> => {
    try {
      // Get the highest account code for this type
      const { data, error } = await supabase
        .from("accounts")
        .select("account_code")
        .ilike("account_code", `${type.charAt(0)}%`)
        .order("account_code", { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextCode = "";
      if (data && data.length > 0) {
        const lastCode = data[0].account_code;
        const numericPart = parseInt(lastCode.substring(1));
        nextCode = `${type.charAt(0)}${(numericPart + 1)
          .toString()
          .padStart(3, "0")}`;
      } else {
        // First account of this type
        nextCode = `${type.charAt(0)}001`;
      }

      return nextCode;
    } catch (error) {
      console.error("Error generating account code:", error);
      // Fallback to timestamp-based code
      return `${type.charAt(0)}${Date.now().toString().slice(-3)}`;
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setAccounts(data || []);

      const total = (data || []).reduce(
        (sum, account) => sum + Number(account.balance),
        0
      );
      setTotalBalance(total);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "balance" ? (value === "" ? 0 : parseFloat(value)) : value,
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
      if (!formData.name || !formData.type || !formData.normal_balance) {
        toast.error("Please fill all required fields");
        return;
      }

      // Generate account code automatically
      const accountCode = await generateAccountCode(formData.type);

      const { error } = await supabase.from("accounts").insert([
        {
          name: formData.name,
          type: formData.type,
          balance: formData.balance,
          account_code: accountCode,
          normal_balance: formData.normal_balance,
          description: formData.description || null,
          is_active: true,
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

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Asset",
      balance: 0,
      account_code: "",
      normal_balance: "Debit",
      description: "",
    });
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "bank":
        return <Banknote className="h-4 w-4 mr-2" />;
      case "cash":
        return <DollarSign className="h-4 w-4 mr-2" />;
      case "card":
        return <CreditCard className="h-4 w-4 mr-2" />;
      default:
        return <Banknote className="h-4 w-4 mr-2" />;
    }
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      account_code: account.account_code,
      normal_balance: account.normal_balance,
      description: account.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          name: formData.name,
          type: formData.type,
          balance: formData.balance,
          account_code: formData.account_code,
          normal_balance: formData.normal_balance,
          description: formData.description || null,
        })
        .eq("id", editingAccount.id);

      if (error) throw error;

      toast.success("Account updated successfully");
      fetchAccounts();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Bank & Cash Accounts</h2>

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
                Enter the details of the new bank or cash account.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Account name"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger className="col-span-3">
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="normal_balance" className="text-right">
                  Normal Balance *
                </Label>
                <Select
                  value={formData.normal_balance}
                  onValueChange={(value) =>
                    handleSelectChange("normal_balance", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select normal balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debit">Debit</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balance" className="text-right">
                  Initial Balance
                </Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  value={formData.balance}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Account description (optional)"
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
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                name="name"
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-type" className="text-right">
                Type *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger className="col-span-3">
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-account-code" className="text-right">
                Account Code *
              </Label>
              <Input
                id="edit-account-code"
                name="account_code"
                value={formData.account_code}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="e.g., A001"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-normal-balance" className="text-right">
                Normal Balance *
              </Label>
              <Select
                value={formData.normal_balance}
                onValueChange={(value) =>
                  handleSelectChange("normal_balance", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select normal balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-balance" className="text-right">
                Balance
              </Label>
              <Input
                id="edit-balance"
                name="balance"
                type="number"
                value={formData.balance}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Account description (optional)"
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
            <Button className="bg-fleet-purple" onClick={handleUpdateAccount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {accounts.length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Account Distribution
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {["bank", "cash", "card"].map((type) => {
                const count = accounts.filter((a) => a.type === type).length;
                return count > 0 ? (
                  <Badge key={type} variant="outline" className="capitalize">
                    {count} {type}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts List</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Normal Balance</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">
                      {account.account_code}
                    </td>
                    <td className="p-3 flex items-center">
                      {getAccountTypeIcon(account.type)}
                      {account.name}
                    </td>
                    <td className="p-3 capitalize">{account.type}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          account.normal_balance === "Debit"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {account.normal_balance}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatter.format(account.balance)}
                    </td>
                    <td className="p-3 flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(account)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(account.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountsSection;
