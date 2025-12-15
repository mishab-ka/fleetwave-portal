# Fix for Dual Transaction Logic

## Current Problem

The dual transaction system is not working correctly for liability transactions. When collecting deposits from drivers (Liability In + Cash In), only the liability is being updated, but the cash/asset balance is not increasing properly.

## Root Cause

The current logic creates only ONE transaction and tries to update the account balance directly. This is not proper double-entry bookkeeping.

## Correct Logic Needed

### For Liability Transactions:

- **Liability In + Cash In** (Collecting deposit):
  - Create Liability transaction: +amount (increases liability)
  - Create Asset transaction: +amount (increases cash/asset)
- **Liability Out + Cash Out** (Refunding deposit):
  - Create Liability transaction: -amount (decreases liability)
  - Create Asset transaction: -amount (decreases cash/asset)

### For Asset Transactions:

- **Asset In + Cash Out** (Buying asset):
  - Create Asset transaction: +amount (increases asset)
  - Create Asset transaction: -amount (decreases cash)
- **Asset Out + Cash In** (Selling asset):
  - Create Asset transaction: -amount (decreases asset)
  - Create Asset transaction: +amount (increases cash)

## Required Changes

1. **Replace single transaction creation with dual transaction creation**
2. **Create proper double-entry transactions**
3. **Update both account balances correctly**
4. **Maintain proper transaction descriptions**

## Code Changes Needed

Replace the current dual transaction logic in `handleAddTransaction` function:

```typescript
// OLD (WRONG) - Single transaction + direct balance update
const { data: transactionData, error: transactionError } = await supabase
  .from("transactions")
  .insert([
    {
      amount: mainAmount,
      type: transactionType,
      description: transactionDescription,
      date: formData.date.toISOString(),
      account_id: formData.payment_account_id,
      category_id: categoryId,
    },
  ]);

// Update account balance directly
const newBalance = selectedAccount.balance + cashAmount;
await supabase
  .from("accounts")
  .update({ balance: newBalance })
  .eq("id", formData.payment_account_id);

// NEW (CORRECT) - Dual transactions for proper double-entry
const transactions = [
  {
    amount: mainAmount,
    type: transactionType, // "asset" or "liability"
    description: mainTransactionDescription,
    date: formData.date.toISOString(),
    account_id: mainAccountId, // The main account for the transaction
    category_id: categoryId,
  },
  {
    amount: cashAmount,
    type: "asset", // Always asset for cash counterpart
    description: cashTransactionDescription,
    date: formData.date.toISOString(),
    account_id: formData.payment_account_id, // The cash account
    category_id: cashCategoryId, // Cash category
  },
];

const { data: transactionData, error: transactionError } = await supabase
  .from("transactions")
  .insert(transactions);

// Update both account balances
const mainAccountNewBalance = mainAccount.balance + mainAmount;
const cashAccountNewBalance = selectedAccount.balance + cashAmount;

await Promise.all([
  supabase
    .from("accounts")
    .update({ balance: mainAccountNewBalance })
    .eq("id", mainAccountId),
  supabase
    .from("accounts")
    .update({ balance: cashAccountNewBalance })
    .eq("id", formData.payment_account_id),
]);
```

This ensures proper double-entry bookkeeping where both sides of the transaction are recorded as separate transactions.






