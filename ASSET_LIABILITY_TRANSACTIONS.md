# Asset and Liability Transactions Feature

## Overview

Enhanced the TransactionsSection component to support "Asset" and "Liability" transaction types, and updated the Assets & Liabilities section to display these transactions in a dedicated tab.

## New Features

### ✅ **Enhanced Transaction Types**

- Added "Asset" and "Liability" options to the transaction type selection
- Updated both Add New Transaction and Edit Transaction dialogs
- Implemented proper transaction amount calculation for these types

### ✅ **Transaction Amount Logic**

- **Asset Transactions**: Always positive amounts (increases assets)
- **Liability Transactions**: Always negative amounts (increases liabilities)
- **Income Transactions**: Always positive amounts (increases income)
- **Expense Transactions**: Always negative amounts (increases expenses)

### ✅ **Assets & Liabilities Tab Integration**

- Added new "Transactions" tab to Assets & Liabilities section
- Displays all Asset and Liability transactions from the transactions table
- Shows transaction details with proper formatting and color coding

## Implementation Details

### **1. Enhanced Transaction Type Selection**

```tsx
<SelectContent>
  <SelectItem value="income">Income</SelectItem>
  <SelectItem value="expense">Expense</SelectItem>
  <SelectItem value="asset">Asset</SelectItem>
  <SelectItem value="liability">Liability</SelectItem>
</SelectContent>
```

### **2. Category Filtering for Asset and Liability**

```tsx
{
  formData.type === "asset" && (
    <>
      <div className="px-2 py-1.5 text-xs font-medium text-blue-600">
        Asset Categories
      </div>
      {categories
        .filter(
          (cat) =>
            cat.type === "asset" &&
            (!cat.parent_category_id || cat.parent_category_id === null)
        )
        .map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            {category.name}
          </SelectItem>
        ))}
    </>
  );
}

{
  formData.type === "liability" && (
    <>
      <div className="px-2 py-1.5 text-xs font-medium text-orange-600">
        Liability Categories
      </div>
      {categories
        .filter(
          (cat) =>
            cat.type === "liability" &&
            (!cat.parent_category_id || cat.parent_category_id === null)
        )
        .map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            {category.name}
          </SelectItem>
        ))}
    </>
  );
}
```

### **3. Enhanced Transaction Amount Calculation**

```tsx
// Calculate transaction amount based on type
let transactionAmount = 0;
if (formData.type === "income") {
  transactionAmount = Math.abs(formData.amount); // Income is always positive
} else if (formData.type === "expense") {
  transactionAmount = -Math.abs(formData.amount); // Expense is always negative
} else if (formData.type === "asset") {
  transactionAmount = Math.abs(formData.amount); // Asset is always positive
} else if (formData.type === "liability") {
  transactionAmount = -Math.abs(formData.amount); // Liability is always negative
}
```

### **4. Enhanced Transaction Type Display**

```tsx
const getTransactionTypeDisplay = (transaction) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        transaction.type === "expense"
          ? "bg-red-100 text-red-800"
          : transaction.type === "income"
          ? "bg-green-100 text-green-800"
          : transaction.type === "asset"
          ? "bg-blue-100 text-blue-800"
          : transaction.type === "liability"
          ? "bg-orange-100 text-orange-800"
          : "bg-gray-100 text-gray-800"
      }`}
    >
      {transaction.type}
    </span>
  );
};
```

### **5. Assets & Liabilities Transactions Tab**

```tsx
<TabsContent value="transactions">
  <Card>
    <CardHeader>
      <CardTitle>Asset & Liability Transactions</CardTitle>
      <CardDescription>
        All transactions categorized as assets or liabilities
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="p-3 font-medium">
                  {transaction.description}
                </TableCell>
                <TableCell className="p-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === "asset"
                        ? "bg-blue-100 text-blue-800"
                        : transaction.type === "liability"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {transaction.type}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-right font-medium">
                  <span
                    className={
                      transaction.amount >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {formatter.format(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell className="p-3">
                  {new Date(transaction.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="p-3">
                  {transaction.accounts?.name || "N/A"}
                </TableCell>
                <TableCell className="p-3">
                  {transaction.categories?.name || "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </CardContent>
  </Card>
</TabsContent>
```

### **6. Enhanced Data Fetching**

```tsx
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
```

## User Experience

### **Adding Asset Transactions:**

1. **Select Transaction Type**: Choose "Asset"
2. **Select Main Category**: Choose from asset categories (e.g., "Equipment", "Property")
3. **Select Subcategory** (Optional): Choose from asset subcategories (e.g., "Computer Equipment", "Office Furniture")
4. **Enter Details**: Description, amount, account, date
5. **Save Transaction**: Creates a positive amount transaction

### **Adding Liability Transactions:**

1. **Select Transaction Type**: Choose "Liability"
2. **Select Main Category**: Choose from liability categories (e.g., "Loans", "Credit Cards")
3. **Select Subcategory** (Optional): Choose from liability subcategories (e.g., "Personal Loan", "Business Loan")
4. **Enter Details**: Description, amount, account, date
5. **Save Transaction**: Creates a negative amount transaction

### **Viewing Asset & Liability Transactions:**

1. **Navigate to Finance**: Go to Finance Management
2. **Select Assets & Liabilities Tab**: Click on "Assets & Liabilities"
3. **Select Transactions Tab**: Click on "Transactions" tab
4. **View All Transactions**: See all Asset and Liability transactions in a table format

## Benefits

### **1. Complete Financial Tracking**

- Track all types of financial transactions
- Separate asset and liability management
- Comprehensive financial reporting

### **2. Enhanced Categorization**

- Asset-specific categories (Equipment, Property, Investments)
- Liability-specific categories (Loans, Credit Cards, Debts)
- Subcategory support for detailed tracking

### **3. Better Financial Management**

- Clear separation of assets and liabilities
- Proper transaction amount handling
- Integrated view in Assets & Liabilities section

### **4. Improved User Experience**

- Intuitive transaction type selection
- Color-coded transaction types
- Dedicated transactions view

## Usage Examples

### **Asset Transaction Examples:**

```
Transaction Type: Asset
Main Category: Equipment
Subcategory: Computer Equipment
Description: "New Laptop Purchase"
Amount: 1500
Result: +1500 (increases assets)
```

### **Liability Transaction Examples:**

```
Transaction Type: Liability
Main Category: Loans
Subcategory: Business Loan
Description: "Business Loan Payment"
Amount: 2000
Result: -2000 (increases liabilities)
```

## Technical Implementation

### **Transaction Amount Logic:**

- **Assets**: Positive amounts (increases asset value)
- **Liabilities**: Negative amounts (increases liability amount)
- **Income**: Positive amounts (increases income)
- **Expenses**: Negative amounts (increases expenses)

### **Database Integration:**

- Uses existing `transactions` table
- Supports both old (capitalized) and new (lowercase) transaction types
- Maintains backward compatibility

### **UI Components:**

- Enhanced transaction type selection
- Color-coded transaction type badges
- Dedicated transactions table in Assets & Liabilities section

## Summary

**The Asset and Liability transactions feature provides:**

- ✅ Complete transaction type support (Income, Expense, Asset, Liability)
- ✅ Proper transaction amount calculation
- ✅ Enhanced category filtering
- ✅ Integrated Assets & Liabilities view
- ✅ Color-coded transaction types
- ✅ Comprehensive financial tracking

**Users can now:**

- ✅ Create Asset transactions (equipment, property, investments)
- ✅ Create Liability transactions (loans, credit cards, debts)
- ✅ View all Asset and Liability transactions in one place
- ✅ Track complete financial picture
- ✅ Manage assets and liabilities effectively

**The system now supports complete financial transaction management with proper asset and liability tracking!** 🎉
