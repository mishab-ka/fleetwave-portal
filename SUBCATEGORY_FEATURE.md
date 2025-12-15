# Subcategory Feature Implementation

## Overview

Added subcategory support to the CategoriesSection component, allowing users to create subcategories with different types when adding categories.

## New Features

### ✅ **Subcategory Type Selection**

- Added "subcategory" as a new category type option
- When "subcategory" is selected, an additional "Subcategory Type" field appears
- Users can choose the actual type (income, expense, asset, liability) for the subcategory

### ✅ **Enhanced Form Fields**

```tsx
const [formData, setFormData] = useState({
  name: "",
  type: "income",
  parent_category_id: "none",
  subcategory_type: "income", // New field for subcategory type selection
});
```

### ✅ **Dynamic UI Components**

- **Conditional Subcategory Type Field**: Only shows when "subcategory" is selected
- **Smart Parent Category Filtering**: Shows all main categories when creating subcategories
- **Enhanced Form Validation**: Handles subcategory type selection properly

## Implementation Details

### **1. Category Types Updated**

```tsx
const categoryTypes = [
  "income",
  "expense",
  "asset",
  "liability",
  "subcategory",
];
```

### **2. Subcategory Type Selection**

```tsx
{
  /* Subcategory Type Selection - Only show when subcategory is selected */
}
{
  formData.type === "subcategory" && (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="subcategory_type" className="text-right">
        Subcategory Type
      </Label>
      <Select
        value={formData.subcategory_type}
        onValueChange={(value) => handleSelectChange("subcategory_type", value)}
      >
        <SelectTrigger className="col-span-3">
          <SelectValue placeholder="Select subcategory type" />
        </SelectTrigger>
        <SelectContent>
          {["income", "expense", "asset", "liability"].map((type) => (
            <SelectItem key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### **3. Smart Parent Category Filtering**

```tsx
{
  categories
    .filter((cat) => {
      // For subcategories, show all main categories (no parent)
      if (formData.type === "subcategory") {
        return !cat.parent_category_id || cat.parent_category_id === null;
      }
      // For regular categories, show categories of the same type with no parent
      return (
        cat.type === formData.type &&
        (!cat.parent_category_id || cat.parent_category_id === null)
      );
    })
    .map((category) => (
      <SelectItem key={category.id} value={category.id.toString()}>
        {category.name}
      </SelectItem>
    ));
}
```

### **4. Enhanced Add Category Logic**

```tsx
const insertData: any = {
  name: formData.name,
  type:
    formData.type === "subcategory" ? formData.subcategory_type : formData.type,
};
```

### **5. Enhanced Edit Category Logic**

```tsx
const updateData: any = {
  name: formData.name,
  type:
    formData.type === "subcategory" ? formData.subcategory_type : formData.type,
};
```

## User Experience

### **Creating a Subcategory:**

1. Click "Add Category" button
2. Enter category name (e.g., "Marketing")
3. Select "Subcategory" as the type
4. **New**: Select subcategory type (e.g., "Expense")
5. Choose parent category (e.g., "Business Expenses")
6. Click "Add Category"

### **Creating a Regular Category:**

1. Click "Add Category" button
2. Enter category name (e.g., "Salary")
3. Select type (e.g., "Income")
4. Choose parent category (optional)
5. Click "Add Category"

### **Creating a Parent Category:**

1. Click "Add Parent Category" button
2. Enter category name (e.g., "Business Expenses")
3. Select type (e.g., "Expense")
4. Leave parent as "No parent (Main category)"
5. Click "Add Category"

## Database Structure

### **Categories Table:**

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Can be income, expense, asset, liability
  parent_category_id INTEGER REFERENCES categories(id),
  category_level INTEGER DEFAULT 0,
  category_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Example Data:**

```sql
-- Main categories
INSERT INTO categories (name, type, parent_category_id) VALUES
('Business Expenses', 'expense', NULL),
('Personal Income', 'income', NULL);

-- Subcategories
INSERT INTO categories (name, type, parent_category_id) VALUES
('Marketing', 'expense', 1), -- Subcategory of Business Expenses
('Office Supplies', 'expense', 1), -- Subcategory of Business Expenses
('Salary', 'income', 2); -- Subcategory of Personal Income
```

## Benefits

### **1. Better Organization**

- Hierarchical category structure
- Clear parent-child relationships
- Easy to understand category hierarchy

### **2. Flexible Type System**

- Subcategories can have different types than their parents
- Example: "Marketing" (expense subcategory) under "Business Expenses" (expense parent)
- Example: "Salary" (income subcategory) under "Personal Income" (income parent)

### **3. Enhanced User Experience**

- Intuitive form with conditional fields
- Clear visual hierarchy in category display
- Easy to create both main categories and subcategories

### **4. Improved Data Management**

- Better categorization of transactions
- More detailed financial reporting
- Easier to track specific expense/income types

## Usage Examples

### **Business Expense Categories:**

```
Business Expenses (Main - Expense)
├── Marketing (Subcategory - Expense)
├── Office Supplies (Subcategory - Expense)
├── Travel (Subcategory - Expense)
└── Utilities (Subcategory - Expense)
```

### **Personal Income Categories:**

```
Personal Income (Main - Income)
├── Salary (Subcategory - Income)
├── Freelance (Subcategory - Income)
├── Investments (Subcategory - Income)
└── Gifts (Subcategory - Income)
```

### **Asset Categories:**

```
Assets (Main - Asset)
├── Cash (Subcategory - Asset)
├── Bank Accounts (Subcategory - Asset)
├── Investments (Subcategory - Asset)
└── Property (Subcategory - Asset)
```

## Technical Implementation

### **Form State Management:**

- Added `subcategory_type` field to form state
- Conditional rendering based on `formData.type === "subcategory"`
- Proper state updates in all form handlers

### **Database Operations:**

- Smart type selection: uses `subcategory_type` when type is "subcategory"
- Maintains parent-child relationships
- Proper foreign key handling

### **UI Components:**

- Conditional subcategory type selection
- Smart parent category filtering
- Enhanced form validation
- Consistent styling and behavior

## Summary

**The subcategory feature provides:**

- ✅ Hierarchical category structure
- ✅ Flexible type system for subcategories
- ✅ Intuitive user interface
- ✅ Better data organization
- ✅ Enhanced financial reporting capabilities

**Users can now create:**

- ✅ Main categories (no parent)
- ✅ Subcategories with different types
- ✅ Complex category hierarchies
- ✅ Better organized financial data

**The system now supports complex financial categorization with clear parent-child relationships!** 🎉
