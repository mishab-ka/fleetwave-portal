# Subcategory Dropdown Feature Implementation

## Overview

Enhanced the TransactionsSection component to show subcategories as a separate dropdown when adding/editing transactions. When a user selects a main category, a second dropdown appears with the subcategories of that main category.

## New Features

### ✅ **Two-Step Category Selection**

- **Step 1**: Select Main Category (required)
- **Step 2**: Select Subcategory (optional) - only appears when main category is selected

### ✅ **Enhanced Form Fields**

```tsx
const [formData, setFormData] = useState({
  description: "",
  amount: 0,
  type: "income",
  date: new Date(),
  account_id: "",
  category_id: "", // For subcategory selection
  main_category_id: "", // New field for main category selection
});
```

### ✅ **Dynamic UI Components**

- **Main Category Dropdown**: Shows only main categories (no parent) based on transaction type
- **Subcategory Dropdown**: Only appears when main category is selected, shows subcategories of that main category
- **Smart Category Logic**: Uses subcategory if selected, otherwise uses main category

## Implementation Details

### **1. Form State Management**

```tsx
const [formData, setFormData] = useState({
  description: "",
  amount: 0,
  type: "income",
  date: new Date(),
  account_id: "",
  category_id: "", // For subcategory selection
  main_category_id: "", // New field for main category selection
});
```

### **2. Enhanced handleSelectChange Function**

```tsx
const handleSelectChange = (name: string, value: string) => {
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  // If the transaction type changes, clear the category selection
  if (name === "type") {
    setFormData((prev) => ({
      ...prev,
      category_id: "", // Clear category when type changes
      main_category_id: "", // Clear main category when type changes
    }));
    setSelectedCategory(null);
  }

  // If the main category changes, clear the subcategory selection
  if (name === "main_category_id") {
    setFormData((prev) => ({
      ...prev,
      category_id: "", // Clear subcategory when main category changes
    }));
    setSelectedCategory(null);
  }

  // If the category changes, check if it's a liability
  if (name === "category_id") {
    const category = categories.find((cat) => cat.id.toString() === value);
    setSelectedCategory(category || null);
  }
};
```

### **3. Main Category Selection UI**

```tsx
{
  /* Main Category Selection */
}
<div className="grid grid-cols-4 items-center gap-4">
  <Label htmlFor="main_category_id" className="text-right">
    Main Category
  </Label>
  <Select
    value={formData.main_category_id}
    onValueChange={(value) => handleSelectChange("main_category_id", value)}
  >
    <SelectTrigger className="col-span-3">
      <SelectValue placeholder="Select main category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="placeholder" disabled>
        Select a main category
      </SelectItem>

      {/* Dynamic Main Categories based on transaction type */}
      {formData.type === "income" && (
        <>
          <div className="px-2 py-1.5 text-xs font-medium text-green-600">
            Income Categories
          </div>
          {categories
            .filter(
              (cat) =>
                cat.type === "income" &&
                (!cat.parent_category_id || cat.parent_category_id === null)
            )
            .map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
        </>
      )}

      {formData.type === "expense" && (
        <>
          <div className="px-2 py-1.5 text-xs font-medium text-red-600">
            Expense Categories
          </div>
          {categories
            .filter(
              (cat) =>
                cat.type === "expense" &&
                (!cat.parent_category_id || cat.parent_category_id === null)
            )
            .map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
        </>
      )}
    </SelectContent>
  </Select>
</div>;
```

### **4. Subcategory Selection UI**

```tsx
{
  /* Subcategory Selection - Only show when main category is selected */
}
{
  formData.main_category_id && (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="category_id" className="text-right">
        Subcategory
      </Label>
      <Select
        value={formData.category_id}
        onValueChange={(value) => handleSelectChange("category_id", value)}
      >
        <SelectTrigger className="col-span-3">
          <SelectValue placeholder="Select subcategory (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No subcategory</SelectItem>
          {categories
            .filter(
              (cat) =>
                cat.parent_category_id &&
                cat.parent_category_id.toString() === formData.main_category_id
            )
            .map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### **5. Smart Category Logic in Transaction Handling**

```tsx
// In handleAddTransaction and handleUpdateTransaction
const accountId = formData.account_id;
// Use subcategory if selected, otherwise use main category
const categoryId = formData.category_id || formData.main_category_id;
```

### **6. Enhanced Edit Functionality**

```tsx
const handleEditClick = (transaction: TransactionWithRelations) => {
  setSelectedTransaction(transaction);

  // Determine if the selected category is a main category or subcategory
  const selectedCategory = categories.find(
    (cat) => cat.id === transaction.category_id
  );
  setSelectedCategory(selectedCategory || null);

  setFormData({
    description: transaction.description || "",
    amount:
      transaction.type === "Liability"
        ? Math.abs(transaction.amount)
        : transaction.amount,
    type: transaction.type === "Liability" ? "income" : transaction.type,
    date: new Date(transaction.date),
    account_id: transaction.account_id.toString(),
    category_id: selectedCategory?.parent_category_id
      ? transaction.category_id.toString()
      : "",
    main_category_id: selectedCategory?.parent_category_id
      ? selectedCategory.parent_category_id.toString()
      : transaction.category_id.toString(),
  });
  setIsEditDialogOpen(true);
};
```

## User Experience

### **Adding a New Transaction:**

1. **Select Transaction Type**: Choose "Income" or "Expense"
2. **Select Main Category**: Choose from main categories (e.g., "Business Expenses", "Personal Income")
3. **Select Subcategory** (Optional): If subcategories exist, choose from them (e.g., "Marketing", "Office Supplies")
4. **Fill Other Details**: Description, amount, account, date
5. **Save Transaction**: Uses subcategory if selected, otherwise uses main category

### **Editing an Existing Transaction:**

1. **Click Edit**: Opens edit dialog with current values
2. **Main Category**: Shows the main category (or parent if it's a subcategory)
3. **Subcategory**: Shows the subcategory if it was a subcategory transaction
4. **Modify as Needed**: Change main category or subcategory as needed
5. **Save Changes**: Updates with new category selection

## Benefits

### **1. Better Organization**

- Clear separation between main categories and subcategories
- Intuitive two-step selection process
- Easy to understand category hierarchy

### **2. Flexible Selection**

- Users can select just a main category
- Users can select a main category + subcategory
- Subcategory selection is optional

### **3. Enhanced User Experience**

- Conditional UI - subcategory dropdown only appears when needed
- Clear visual hierarchy
- Intuitive form flow

### **4. Improved Data Management**

- Better categorization of transactions
- More detailed financial reporting
- Easier to track specific expense/income types

## Usage Examples

### **Business Expense Transaction:**

```
Transaction Type: Expense
Main Category: Business Expenses
Subcategory: Marketing (optional)
Result: Transaction categorized under "Marketing" subcategory
```

### **Personal Income Transaction:**

```
Transaction Type: Income
Main Category: Personal Income
Subcategory: Salary (optional)
Result: Transaction categorized under "Salary" subcategory
```

### **Simple Transaction (No Subcategory):**

```
Transaction Type: Expense
Main Category: Utilities
Subcategory: (None selected)
Result: Transaction categorized under "Utilities" main category
```

## Technical Implementation

### **Form State Management:**

- Added `main_category_id` field to form state
- Conditional rendering based on `formData.main_category_id`
- Proper state updates in all form handlers

### **Category Filtering:**

- Main categories: `(!cat.parent_category_id || cat.parent_category_id === null)`
- Subcategories: `cat.parent_category_id && cat.parent_category_id.toString() === formData.main_category_id`

### **Transaction Logic:**

- Smart category selection: `formData.category_id || formData.main_category_id`
- Maintains backward compatibility
- Proper validation and error handling

### **Edit Functionality:**

- Determines if existing category is main or subcategory
- Sets appropriate form fields for editing
- Maintains category hierarchy in edit mode

## Summary

**The subcategory dropdown feature provides:**

- ✅ Two-step category selection process
- ✅ Conditional subcategory dropdown
- ✅ Smart category logic
- ✅ Enhanced user experience
- ✅ Better data organization

**Users can now:**

- ✅ Select main categories easily
- ✅ Optionally select subcategories
- ✅ See clear category hierarchy
- ✅ Edit transactions with proper category context

**The system now supports intuitive category selection with clear main category and subcategory separation!** 🎉
