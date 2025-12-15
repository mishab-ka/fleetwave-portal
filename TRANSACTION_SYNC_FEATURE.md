# Transaction Synchronization Feature

## Overview

Enhanced the finance system to automatically sync Asset and Liability transactions between the TransactionsSection and the Assets & Liabilities section. When a user creates an Asset or Liability transaction in the Transactions tab, it automatically appears in the corresponding Asset Inventory or Liabilities tab.

## New Features

### ✅ **Automatic Transaction Synchronization**

- Asset transactions created in TransactionsSection automatically appear in Asset Inventory tab
- Liability transactions created in TransactionsSection automatically appear in Liabilities tab
- Real-time refresh when new transactions are added
- Seamless integration between different finance sections

### ✅ **Enhanced Data Fetching**

- AssetsLiabilitiesSection now fetches both old (capitalized) and new (lowercase) transaction types
- Combines data from multiple sources for comprehensive asset and liability tracking
- Maintains backward compatibility with existing data

### ✅ **Cross-Component Communication**

- Custom hook for managing refresh state across components
- Automatic refresh triggers when relevant transactions are added
- Efficient data synchronization without unnecessary API calls

## Implementation Details

### **1. Custom Hook for Refresh Management**

```tsx
// useFinanceRefresh.ts
import { useState, useCallback } from "react";

export const useFinanceRefresh = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    refreshTrigger,
    triggerRefresh,
  };
};
```

### **2. Enhanced AdminFinance Component**

```tsx
const AdminFinance = () => {
  const { refreshTrigger, triggerRefresh } = useFinanceRefresh();

  return (
    <AdminLayout title="Finance Management">
      <div className="p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-6 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="assets-liabilities">
              Assets & Liabilities
            </TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <TransactionsSection onTransactionAdded={triggerRefresh} />
          </TabsContent>

          <TabsContent value="assets-liabilities">
            <AssetsLiabilitiesSection refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};
```

### **3. Updated TransactionsSection**

```tsx
interface TransactionsSectionProps {
  onTransactionAdded?: () => void;
}

const TransactionsSection = ({
  onTransactionAdded,
}: TransactionsSectionProps) => {
  // ... existing code ...

  const handleAddTransaction = async () => {
    try {
      // ... transaction creation logic ...

      toast.success("Transaction added successfully");
      fetchTransactions();
      fetchAccounts();
      setIsAddDialogOpen(false);
      resetForm();

      // Trigger refresh for Assets & Liabilities section if it's an asset or liability transaction
      if (formData.type === "asset" || formData.type === "liability") {
        onTransactionAdded?.();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };
};
```

### **4. Enhanced AssetsLiabilitiesSection**

```tsx
interface AssetsLiabilitiesSectionProps {
  refreshTrigger?: number;
}

const AssetsLiabilitiesSection = ({
  refreshTrigger,
}: AssetsLiabilitiesSectionProps) => {
  // ... existing code ...

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch old Asset and Liability transactions (capitalized)
      const { data: oldAssetsData, error: oldAssetsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "Asset")
        .order("created_at", { ascending: false });

      const { data: oldLiabilitiesData, error: oldLiabilitiesError } =
        await supabase
          .from("transactions")
          .select("*")
          .eq("type", "Liability")
          .order("date", { ascending: true });

      // Fetch new asset and liability transactions (lowercase)
      const { data: newTransactionsData, error: newTransactionsError } =
        await supabase
          .from("transactions")
          .select(
            `
          id,
          description,
          amount,
          type,
          date,
          created_at,
          account_id,
          category_id,
          accounts:account_id (name),
          categories:category_id (name)
        `
          )
          .in("type", ["asset", "liability"])
          .order("created_at", { ascending: false });

      // Transform old assets (capitalized)
      const transformedOldAssets = (oldAssetsData || []).map((item) => ({
        id: item.id.toString(),
        type: item.description || "Unknown Asset",
        value: item.amount || 0,
        description: item.description,
        purchase_date: item.date,
        created_at: item.created_at,
      }));

      // Transform old liabilities (capitalized)
      const transformedOldLiabilities = (oldLiabilitiesData || []).map(
        (item) => ({
          id: item.id.toString(),
          type: item.description || "Loan",
          due_date: item.date,
          amount_due: Math.abs(item.amount) || 0,
          status: item.description?.includes("Paid")
            ? "Paid"
            : item.description?.includes("Overdue")
            ? "Overdue"
            : "Pending",
          description: item.description,
          created_at: item.created_at,
        })
      );

      // Transform new asset transactions (lowercase)
      const transformedNewAssets = (newTransactionsData || [])
        .filter((item) => item.type === "asset")
        .map((item) => ({
          id: item.id.toString(),
          type: item.categories?.name || item.description || "Asset",
          value: Math.abs(item.amount) || 0,
          description: item.description,
          purchase_date: item.date,
          created_at: item.created_at,
        }));

      // Transform new liability transactions (lowercase)
      const transformedNewLiabilities = (newTransactionsData || [])
        .filter((item) => item.type === "liability")
        .map((item) => ({
          id: item.id.toString(),
          type: item.categories?.name || item.description || "Liability",
          due_date: item.date,
          amount_due: Math.abs(item.amount) || 0,
          status: "Pending", // Default status for new liability transactions
          description: item.description,
          created_at: item.created_at,
        }));

      // Combine old and new assets
      const allAssets = [...transformedOldAssets, ...transformedNewAssets];

      // Combine old and new liabilities
      const allLiabilities = [
        ...transformedOldLiabilities,
        ...transformedNewLiabilities,
      ];

      setAssets(allAssets);
      setLiabilities(allLiabilities);
      setTransactions(newTransactionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load assets and liabilities data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger]);
};
```

## User Experience

### **Adding Asset Transactions:**

1. **Navigate to Transactions Tab**: Go to Finance Management → Transactions
2. **Select Transaction Type**: Choose "Asset" from the dropdown
3. **Fill Transaction Details**: Enter description, amount, account, category, date
4. **Save Transaction**: Click "Add Transaction"
5. **Automatic Sync**: Transaction automatically appears in Assets & Liabilities → Asset Inventory tab

### **Adding Liability Transactions:**

1. **Navigate to Transactions Tab**: Go to Finance Management → Transactions
2. **Select Transaction Type**: Choose "Liability" from the dropdown
3. **Fill Transaction Details**: Enter description, amount, account, category, date
4. **Save Transaction**: Click "Add Transaction"
5. **Automatic Sync**: Transaction automatically appears in Assets & Liabilities → Liabilities tab

### **Viewing Synced Transactions:**

1. **Navigate to Assets & Liabilities**: Go to Finance Management → Assets & Liabilities
2. **Asset Inventory Tab**: View all asset transactions (old and new)
3. **Liabilities Tab**: View all liability transactions (old and new)
4. **Transactions Tab**: View all asset and liability transactions in a table format

## Benefits

### **1. Seamless Integration**

- No need to manually add transactions in multiple places
- Single source of truth for all financial data
- Consistent data across all finance sections

### **2. Real-time Synchronization**

- Immediate updates when transactions are added
- No page refresh required
- Automatic data consistency

### **3. Enhanced User Experience**

- Intuitive workflow for adding transactions
- Comprehensive view of all assets and liabilities
- Reduced data entry and potential errors

### **4. Backward Compatibility**

- Existing data continues to work
- Support for both old and new transaction types
- No data migration required

## Technical Implementation

### **Data Flow:**

1. **User adds transaction** in TransactionsSection
2. **Transaction saved** to database
3. **onTransactionAdded callback** triggered (if asset/liability)
4. **refreshTrigger updated** in AdminFinance
5. **AssetsLiabilitiesSection refreshes** data
6. **New transaction appears** in appropriate tab

### **Refresh Mechanism:**

- **Custom Hook**: `useFinanceRefresh` manages refresh state
- **Props Passing**: Refresh function passed down to TransactionsSection
- **Trigger Prop**: Refresh trigger passed to AssetsLiabilitiesSection
- **useEffect**: Watches for refresh trigger changes and refetches data

### **Data Transformation:**

- **Old Assets**: Capitalized "Asset" transactions
- **New Assets**: Lowercase "asset" transactions with category names
- **Old Liabilities**: Capitalized "Liability" transactions
- **New Liabilities**: Lowercase "liability" transactions with category names
- **Combined Data**: All data merged into single arrays for display

## Usage Examples

### **Asset Transaction Flow:**

```
1. User creates "Equipment Purchase" transaction with type "asset"
2. Transaction saved to database
3. AssetsLiabilitiesSection automatically refreshes
4. Transaction appears in Asset Inventory tab as "Equipment Purchase"
5. Shows in both Asset Inventory and Transactions tabs
```

### **Liability Transaction Flow:**

```
1. User creates "Business Loan" transaction with type "liability"
2. Transaction saved to database
3. AssetsLiabilitiesSection automatically refreshes
4. Transaction appears in Liabilities tab as "Business Loan"
5. Shows in both Liabilities and Transactions tabs
```

## Summary

**The transaction synchronization feature provides:**

- ✅ Automatic sync between TransactionsSection and Assets & Liabilities
- ✅ Real-time refresh when new transactions are added
- ✅ Support for both Asset and Liability transaction types
- ✅ Backward compatibility with existing data
- ✅ Enhanced user experience with seamless integration

**Users can now:**

- ✅ Add Asset transactions in Transactions tab and see them in Asset Inventory
- ✅ Add Liability transactions in Transactions tab and see them in Liabilities tab
- ✅ View comprehensive asset and liability data in one place
- ✅ Maintain data consistency across all finance sections

**The system now provides seamless transaction synchronization across all finance components!** 🎉
