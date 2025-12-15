# Plus/Minus Selector Feature for Asset and Liability Transactions

## Overview

Enhanced the TransactionsSection component to include a +/- direction selector for Asset and Liability transactions. This allows users to control whether the transaction amount should be added to or subtracted from the selected account balance.

## New Features

### ✅ **Direction Selector for Asset and Liability Transactions**

- Added +/- selector that appears only when transaction type is "asset" or "liability"
- Clear visual indicators with green "+" and red "-" icons
- Intuitive labels: "Add to Account Balance" and "Subtract from Account Balance"
- Conditional rendering based on transaction type

### ✅ **Enhanced Transaction Amount Calculation**

- Updated transaction amount calculation to use the direction selector
- Maintains existing logic for Income and Expense transactions
- Flexible amount handling for Asset and Liability transactions

### ✅ **Account Balance Impact Control**

- Users can control how Asset and Liability transactions affect account balances
- Positive amounts add to account balance
- Negative amounts subtract from account balance
- Real-time account balance updates based on direction selection

## Implementation Details

### **1. Enhanced Form State**

```tsx
const [formData, setFormData] = useState({
  description: "",
  amount: 0,
  type: "income",
  date: new Date(),
  account_id: "",
  category_id: "",
  main_category_id: "",
  amount_direction: "+", // New field for +/- selector
});
```

### **2. Direction Selector UI Component**

```tsx
{
  /* Amount Direction Selector - Only show for Asset and Liability transactions */
}
{
  (formData.type === "asset" || formData.type === "liability") && (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="amount_direction" className="text-right">
        Direction
      </Label>
      <Select
        value={formData.amount_direction}
        onValueChange={(value) => handleSelectChange("amount_direction", value)}
      >
        <SelectTrigger className="col-span-3">
          <SelectValue placeholder="Select direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="+">
            <div className="flex items-center">
              <span className="text-green-600 font-bold mr-2">+</span>
              Add to Account Balance
            </div>
          </SelectItem>
          <SelectItem value="-">
            <div className="flex items-center">
              <span className="text-red-600 font-bold mr-2">-</span>
              Subtract from Account Balance
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

### **3. Enhanced Transaction Amount Calculation**

```tsx
// Calculate transaction amount based on type and direction
let transactionAmount = 0;
if (formData.type === "income") {
  transactionAmount = Math.abs(formData.amount); // Income is always positive
} else if (formData.type === "expense") {
  transactionAmount = -Math.abs(formData.amount); // Expense is always negative
} else if (formData.type === "asset") {
  // For assets, use the direction selector
  transactionAmount =
    formData.amount_direction === "+"
      ? Math.abs(formData.amount)
      : -Math.abs(formData.amount);
} else if (formData.type === "liability") {
  // For liabilities, use the direction selector
  transactionAmount =
    formData.amount_direction === "+"
      ? Math.abs(formData.amount)
      : -Math.abs(formData.amount);
}
```

### **4. Enhanced Form Reset Logic**

```tsx
const resetForm = () => {
  setFormData({
    description: "",
    amount: 0,
    type: "income",
    date: new Date(),
    account_id: "",
    category_id: "none",
    main_category_id: "",
    amount_direction: "+", // Reset to default "+"
  });
};
```

### **5. Enhanced Transaction Type Change Logic**

```tsx
// If the transaction type changes, clear the category selection
if (name === "type") {
  setFormData((prev) => ({
    ...prev,
    category_id: "none", // Clear category when type changes
    main_category_id: "", // Clear main category when type changes
    amount_direction: "+", // Reset amount direction when type changes
  }));
  setSelectedCategory(null);
}
```

### **6. Enhanced Edit Transaction Logic**

```tsx
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
    : "none",
  main_category_id: selectedCategory?.parent_category_id
    ? selectedCategory.parent_category_id.toString()
    : transaction.category_id.toString(),
  amount_direction:
    transaction.type === "asset" || transaction.type === "liability"
      ? transaction.amount >= 0
        ? "+"
        : "-"
      : "+",
});
```

## User Experience

### **Adding Asset Transactions:**

1. **Select Transaction Type**: Choose "Asset" from the dropdown
2. **Enter Amount**: Enter the transaction amount
3. **Select Direction**: Choose "+" to add to account balance or "-" to subtract
4. **Fill Other Details**: Select account, category, date, description
5. **Save Transaction**: Transaction is saved with the specified direction

### **Adding Liability Transactions:**

1. **Select Transaction Type**: Choose "Liability" from the dropdown
2. **Enter Amount**: Enter the transaction amount
3. **Select Direction**: Choose "+" to add to account balance or "-" to subtract
4. **Fill Other Details**: Select account, category, date, description
5. **Save Transaction**: Transaction is saved with the specified direction

### **Editing Existing Transactions:**

1. **Click Edit**: Opens edit dialog with current values
2. **Direction Preserved**: Shows the current direction based on existing amount
3. **Change Direction**: Can modify the direction if needed
4. **Update Transaction**: Saves changes with new direction

## Benefits

### **1. Flexible Account Balance Management**

- Control how Asset and Liability transactions affect account balances
- Positive amounts increase account balance
- Negative amounts decrease account balance
- Real-time balance updates

### **2. Intuitive User Interface**

- Clear visual indicators with color-coded icons
- Descriptive labels for each direction
- Conditional rendering only when needed
- Consistent with existing form design

### **3. Enhanced Financial Control**

- Precise control over account balance changes
- Support for complex financial scenarios
- Maintains data integrity
- Backward compatibility with existing transactions

### **4. Improved User Experience**

- Clear direction selection process
- Visual feedback with icons and colors
- Intuitive form flow
- Consistent behavior across add and edit operations

## Usage Examples

### **Asset Transaction Examples:**

#### **Adding Asset Value (+):**

```
Transaction Type: Asset
Amount: 5000
Direction: + (Add to Account Balance)
Result: +5000 (increases account balance)
Description: "Equipment Purchase"
```

#### **Reducing Asset Value (-):**

```
Transaction Type: Asset
Amount: 1000
Direction: - (Subtract from Account Balance)
Result: -1000 (decreases account balance)
Description: "Equipment Depreciation"
```

### **Liability Transaction Examples:**

#### **Adding Liability (+):**

```
Transaction Type: Liability
Amount: 2000
Direction: + (Add to Account Balance)
Result: +2000 (increases account balance)
Description: "New Loan Received"
```

#### **Reducing Liability (-):**

```
Transaction Type: Liability
Amount: 500
Direction: - (Subtract from Account Balance)
Result: -500 (decreases account balance)
Description: "Loan Payment Made"
```

## Technical Implementation

### **Form State Management:**

- Added `amount_direction` field to form state
- Default value is "+" for new transactions
- Resets to "+" when transaction type changes
- Preserved when editing existing transactions

### **Conditional Rendering:**

- Direction selector only appears for Asset and Liability transactions
- Hidden for Income and Expense transactions
- Consistent behavior in both add and edit dialogs

### **Amount Calculation Logic:**

- Income: Always positive (adds to balance)
- Expense: Always negative (subtracts from balance)
- Asset: Uses direction selector (+/-)
- Liability: Uses direction selector (+/-)

### **Account Balance Updates:**

- Account balance is updated based on calculated transaction amount
- Positive amounts increase balance
- Negative amounts decrease balance
- Real-time updates after transaction creation/editing

## Summary

**The Plus/Minus Selector feature provides:**

- ✅ Direction control for Asset and Liability transactions
- ✅ Visual indicators with color-coded icons
- ✅ Intuitive user interface with clear labels
- ✅ Flexible account balance management
- ✅ Enhanced financial control and precision

**Users can now:**

- ✅ Control how Asset transactions affect account balances
- ✅ Control how Liability transactions affect account balances
- ✅ Add or subtract amounts from selected accounts
- ✅ Maintain precise financial tracking
- ✅ Handle complex financial scenarios with ease

**The system now provides complete control over Asset and Liability transaction directions!** 🎉
