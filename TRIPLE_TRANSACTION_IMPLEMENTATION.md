# Triple Transaction System - Implementation Guide

## Changes Required

### 1. Update Form Data Structure (Line ~128-142)

**REPLACE:**

```typescript
const [formData, setFormData] = useState({
  description: "",
  amount: 0,
  type: "income",
  date: new Date(),
  account_id: "",
  category_id: "",
  main_category_id: "", // New field for main category selection
  amount_direction: "+", // New field for +/- selector (only for asset/liability)
  // New fields for dual transaction system
  asset_transaction_type: "asset_in", // "asset_in" or "asset_out"
  cash_transaction_type: "cash_out", // "cash_out" or "cash_in"
  payment_account_id: "", // Account to use for cash transaction
  transaction_mode: "single", // "single" or "dual"
});
```

**WITH:**

```typescript
const [formData, setFormData] = useState({
  description: "",
  amount: 0,
  type: "income",
  date: new Date(),
  account_id: "",
  category_id: "",
  main_category_id: "", // New field for main category selection
  amount_direction: "+", // New field for +/- selector (only for asset/liability)
  // New fields for triple transaction system
  asset_transaction_type: "asset_in", // "asset_in" or "asset_out"
  cash_transaction_type: "cash_out", // "cash_out" or "cash_in"
  liability_transaction_type: "liability_in", // "liability_in" or "liability_out"
  payment_account_id: "", // Account to use for cash transaction
  transaction_mode: "single", // "single" or "dual"
});
```

### 2. Update Reset Form Function

**FIND the resetForm function and ADD:**

```typescript
liability_transaction_type: "liability_in",
```

### 3. Update UI - Replace Dual Transaction Fields (Lines ~1075-1200)

**REPLACE the current dual transaction UI with:**

```jsx
{
  /* Triple Transaction Fields - Show for asset/liability OR when dual mode is selected */
}
{
  formData.transaction_mode === "dual" && (
    <>
      {/* Asset Transaction */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="asset-transaction-type" className="text-right">
          Asset Transaction *
        </Label>
        <Select
          value={formData.asset_transaction_type}
          onValueChange={(value) =>
            handleSelectChange("asset_transaction_type", value)
          }
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select asset transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asset_in">
              📈 Asset In (Purchase/Acquire)
            </SelectItem>
            <SelectItem value="asset_out">
              📉 Asset Out (Sell/Dispose)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cash Transaction */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="cash-transaction-type" className="text-right">
          Cash Transaction *
        </Label>
        <Select
          value={formData.cash_transaction_type}
          onValueChange={(value) =>
            handleSelectChange("cash_transaction_type", value)
          }
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select cash transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash_in">💰 Cash In (Receipt)</SelectItem>
            <SelectItem value="cash_out">💸 Cash Out (Payment)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liability Transaction */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="liability-transaction-type" className="text-right">
          Liability Transaction *
        </Label>
        <Select
          value={formData.liability_transaction_type}
          onValueChange={(value) =>
            handleSelectChange("liability_transaction_type", value)
          }
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select liability transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="liability_in">
              📈 Liability In (Incur Debt)
            </SelectItem>
            <SelectItem value="liability_out">
              📉 Liability Out (Pay Debt)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Flow Indicator */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Transaction Flow</Label>
        <div className="col-span-3 p-3 bg-gray-50 rounded-md border">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Selected Transactions:
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center">
              <span className="font-semibold">
                {formData.asset_transaction_type === "asset_in"
                  ? "📈 Asset In"
                  : "📉 Asset Out"}
              </span>
              <span className="ml-2">
                {formData.asset_transaction_type === "asset_in" ? "+" : "-"}${formData.amount || 0}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold">
                {formData.cash_transaction_type === "cash_in"
                  ? "💰 Cash In"
                  : "💸 Cash Out"}
              </span>
              <span className="ml-2">
                {formData.cash_transaction_type === "cash_in" ? "+" : "-"}${formData.amount || 0}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold">
                {formData.liability_transaction_type === "liability_in"
                  ? "📈 Liability In"
                  : "📉 Liability Out"}
              </span>
              <span className="ml-2">
                {formData.liability_transaction_type === "liability_in"
                  ? "+"
                  : "-"}
                ${formData.amount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Account Selection */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="payment-account" className="text-right">
          Cash Account *
        </Label>
        <Select
          value={formData.payment_account_id}
          onValueChange={(value) =>
            handleSelectChange("payment_account_id", value)
          }
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select cash account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.name} ({formatter.format(account.balance)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
```

### 4. Update Transaction Creation Logic

**REPLACE the dual transaction logic with:**

```typescript
if (formData.transaction_mode === "dual") {
  // Triple transaction logic - Create up to 3 transactions
  const selectedAccount = accounts.find(
    (acc) => acc.id.toString() === formData.payment_account_id
  );
  if (!selectedAccount) {
    toast.error("Selected payment account not found");
    return;
  }

  const amount = parseFloat(formData.amount.toString());
  const transactions = [];

  // Use subcategory if selected, otherwise use main category
  const categoryId =
    formData.category_id && formData.category_id !== "none"
      ? formData.category_id
      : formData.main_category_id;

  // Create Asset Transaction
  if (formData.asset_transaction_type !== "none") {
    const assetAmount =
      formData.asset_transaction_type === "asset_in"
        ? Math.abs(amount)
        : -Math.abs(amount);

    transactions.push({
      amount: assetAmount,
      type: "asset",
      description: `Asset ${
        formData.asset_transaction_type === "asset_in" ? "Purchase" : "Sale"
      } - ${formData.description}`,
      date: formData.date.toISOString(),
      account_id: formData.payment_account_id,
      category_id: categoryId,
    });
  }

  // Create Cash Transaction
  if (formData.cash_transaction_type !== "none") {
    const cashAmount =
      formData.cash_transaction_type === "cash_in"
        ? Math.abs(amount)
        : -Math.abs(amount);

    transactions.push({
      amount: cashAmount,
      type: "asset", // Cash is an asset
      description: `Cash ${
        formData.cash_transaction_type === "cash_in" ? "Receipt" : "Payment"
      } - ${formData.description}`,
      date: formData.date.toISOString(),
      account_id: formData.payment_account_id,
      category_id: null, // Cash transactions typically don't have categories
    });
  }

  // Create Liability Transaction
  if (formData.liability_transaction_type !== "none") {
    const liabilityAmount =
      formData.liability_transaction_type === "liability_in"
        ? Math.abs(amount)
        : -Math.abs(amount);

    transactions.push({
      amount: liabilityAmount,
      type: "liability",
      description: `Liability ${
        formData.liability_transaction_type === "liability_in"
          ? "Incurred"
          : "Payment"
      } - ${formData.description}`,
      date: formData.date.toISOString(),
      account_id: formData.payment_account_id,
      category_id: categoryId,
    });
  }

  // Insert all transactions
  const { data: transactionData, error: transactionError } = await supabase
    .from("transactions")
    .insert(transactions)
    .select();

  if (transactionError) throw transactionError;

  // Update account balance
  const totalCashChange = transactions
    .filter((t) => t.type === "asset")
    .reduce((sum, t) => sum + t.amount, 0);

  const newBalance = selectedAccount.balance + totalCashChange;
  const { error: accountUpdateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", formData.payment_account_id);

  if (accountUpdateError) throw accountUpdateError;

  toast.success(`Created ${transactions.length} transactions successfully`);
}
```

## Expected Result

After implementing these changes:

1. **When Asset or Liability is selected**: All three transaction selectors will appear
2. **User can choose**: Asset In/Out, Cash In/Out, Liability In/Out independently
3. **Transaction Flow**: Shows preview of all selected transactions
4. **Multiple Transactions**: Creates separate transactions for each selected type
5. **Proper Bookkeeping**: Each transaction type is recorded separately

**Example: Collecting Deposit from Drivers**

- Asset Transaction: Asset In (+1000)
- Cash Transaction: Cash In (+1000)
- Liability Transaction: Liability In (+1000)
- Result: 3 separate transactions created






