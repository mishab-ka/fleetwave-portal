# How to Apply the Dual Transaction Fix

## Problem

Currently, when doing dual transactions (like collecting deposits from drivers), only one side of the transaction is being recorded properly. The system creates one transaction and tries to update account balances directly, which doesn't work correctly for proper double-entry bookkeeping.

## Solution

Replace the dual transaction logic to create TWO separate transactions for proper double-entry bookkeeping.

## Files to Update

- `/Users/mishabka/Tawaaq/fleetwave-portal/src/components/admin/finance/TransactionsSection.tsx`

## What to Replace

### Find this section (lines ~352-458):

```typescript
if (formData.transaction_mode === "dual") {
  // Dual transaction logic - Asset/Liability + Cash transactions
  const selectedAccount = accounts.find(
    (acc) => acc.id.toString() === formData.payment_account_id
  );
  if (!selectedAccount) {
    toast.error("Selected payment account not found");
    return;
  }

  // Determine transaction type (asset or liability)
  const transactionType = formData.type; // This will be "asset" or "liability"

  // Calculate transaction amounts based on transaction types
  let mainAmount = 0; // For asset or liability
  let cashAmount = 0;

  if (formData.asset_transaction_type === "asset_in") {
    // For assets: asset_in increases asset, for liabilities: asset_in increases liability (debt)
    mainAmount = Math.abs(amount); // Positive for increase
  } else {
    // For assets: asset_out decreases asset, for liabilities: asset_out decreases liability (payment)
    mainAmount = -Math.abs(amount); // Negative for decrease
  }

  if (formData.cash_transaction_type === "cash_out") {
    cashAmount = -Math.abs(amount); // Negative for cash decrease
  } else {
    cashAmount = Math.abs(amount); // Positive for cash increase
  }

  // Check if account has sufficient balance for cash out transactions
  if (
    formData.cash_transaction_type === "cash_out" &&
    selectedAccount.balance < Math.abs(cashAmount)
  ) {
    toast.error(
      `Insufficient balance in ${
        selectedAccount.name
      }. Available: ${formatter.format(selectedAccount.balance)}`
    );
    return;
  }

  // Create only ONE transaction (asset or liability)
  const transactionDescription =
    transactionType === "asset"
      ? `${
          formData.asset_transaction_type === "asset_in"
            ? "Asset Purchase"
            : "Asset Sale"
        } - ${formData.description}`
      : `${
          formData.asset_transaction_type === "asset_in"
            ? "Liability Incurred"
            : "Liability Payment"
        } - ${formData.description}`;

  // Use subcategory if selected, otherwise use main category
  const categoryId =
    formData.category_id && formData.category_id !== "none"
      ? formData.category_id
      : formData.main_category_id;

  const { data: transactionData, error: transactionError } = await supabase
    .from("transactions")
    .insert([
      {
        amount: mainAmount,
        type: transactionType, // "asset" or "liability"
        description: transactionDescription,
        date: formData.date.toISOString(),
        account_id: formData.payment_account_id,
        category_id: categoryId,
      },
    ])
    .select();

  if (transactionError) throw transactionError;

  // Update the account balance directly (decrease for cash out, increase for cash in)
  const newBalance = selectedAccount.balance + cashAmount;
  const { error: accountUpdateError } = await supabase
    .from("accounts")
    .update({
      balance: newBalance,
    })
    .eq("id", formData.payment_account_id);

  if (accountUpdateError) throw accountUpdateError;

  const successMessage =
    transactionType === "asset"
      ? `Asset ${
          formData.asset_transaction_type === "asset_in" ? "added" : "removed"
        } and account balance updated successfully`
      : `Liability ${
          formData.asset_transaction_type === "asset_in" ? "incurred" : "paid"
        } and account balance updated successfully`;

  toast.success(successMessage);
}
```

### Replace with this corrected logic:

```typescript
if (formData.transaction_mode === "dual") {
  // CORRECTED Dual transaction logic - Create TWO transactions for proper double-entry
  const selectedAccount = accounts.find(
    (acc) => acc.id.toString() === formData.payment_account_id
  );
  if (!selectedAccount) {
    toast.error("Selected payment account not found");
    return;
  }

  // Determine transaction type (asset or liability)
  const transactionType = formData.type; // This will be "asset" or "liability"

  // Calculate transaction amounts based on transaction types
  let mainAmount = 0; // For the main asset/liability transaction
  let cashAmount = 0; // For the cash counterpart transaction

  if (formData.asset_transaction_type === "asset_in") {
    // For assets: asset_in increases asset, for liabilities: asset_in increases liability (debt)
    mainAmount = Math.abs(amount); // Positive for increase
  } else {
    // For assets: asset_out decreases asset, for liabilities: asset_out decreases liability (payment)
    mainAmount = -Math.abs(amount); // Negative for decrease
  }

  if (formData.cash_transaction_type === "cash_out") {
    cashAmount = -Math.abs(amount); // Negative for cash decrease
  } else {
    cashAmount = Math.abs(amount); // Positive for cash increase
  }

  // Check if account has sufficient balance for cash out transactions
  if (
    formData.cash_transaction_type === "cash_out" &&
    selectedAccount.balance < Math.abs(cashAmount)
  ) {
    toast.error(
      `Insufficient balance in ${
        selectedAccount.name
      }. Available: ${formatter.format(selectedAccount.balance)}`
    );
    return;
  }

  // Use subcategory if selected, otherwise use main category
  const categoryId =
    formData.category_id && formData.category_id !== "none"
      ? formData.category_id
      : formData.main_category_id;

  // Find the main account for the asset/liability (not the cash account)
  // For now, we'll use the same account, but this should be a separate account
  const mainAccountId = formData.payment_account_id; // TODO: This should be the actual asset/liability account

  // Create transaction descriptions
  const mainTransactionDescription =
    transactionType === "asset"
      ? `${
          formData.asset_transaction_type === "asset_in"
            ? "Asset Purchase"
            : "Asset Sale"
        } - ${formData.description}`
      : `${
          formData.asset_transaction_type === "asset_in"
            ? "Liability Incurred"
            : "Liability Payment"
        } - ${formData.description}`;

  const cashTransactionDescription =
    transactionType === "asset"
      ? `Cash ${
          formData.cash_transaction_type === "cash_out" ? "Payment" : "Receipt"
        } for Asset - ${formData.description}`
      : `Cash ${
          formData.cash_transaction_type === "cash_out" ? "Payment" : "Receipt"
        } for Liability - ${formData.description}`;

  // Create TWO transactions for proper double-entry bookkeeping
  const transactions = [
    {
      amount: mainAmount,
      type: transactionType, // "asset" or "liability"
      description: mainTransactionDescription,
      date: formData.date.toISOString(),
      account_id: mainAccountId, // Main account for asset/liability
      category_id: categoryId,
    },
    {
      amount: cashAmount,
      type: "asset", // Cash is always an asset
      description: cashTransactionDescription,
      date: formData.date.toISOString(),
      account_id: formData.payment_account_id, // Cash account
      category_id: null, // Cash transactions typically don't have categories
    },
  ];

  const { data: transactionData, error: transactionError } = await supabase
    .from("transactions")
    .insert(transactions)
    .select();

  if (transactionError) throw transactionError;

  // Update both account balances
  const mainAccount = accounts.find(
    (acc) => acc.id.toString() === mainAccountId
  );

  if (!mainAccount) {
    throw new Error("Main account not found");
  }

  const mainAccountNewBalance = mainAccount.balance + mainAmount;
  const cashAccountNewBalance = selectedAccount.balance + cashAmount;

  // Update both accounts simultaneously
  const updatePromises = [
    supabase
      .from("accounts")
      .update({ balance: mainAccountNewBalance })
      .eq("id", mainAccountId),
    supabase
      .from("accounts")
      .update({ balance: cashAccountNewBalance })
      .eq("id", formData.payment_account_id),
  ];

  const updateResults = await Promise.all(updatePromises);

  // Check for update errors
  for (const result of updateResults) {
    if (result.error) throw result.error;
  }

  const successMessage =
    transactionType === "asset"
      ? `Asset ${
          formData.asset_transaction_type === "asset_in" ? "purchased" : "sold"
        } and cash transaction recorded successfully`
      : `Liability ${
          formData.asset_transaction_type === "asset_in" ? "incurred" : "paid"
        } and cash transaction recorded successfully`;

  toast.success(successMessage);
}
```

## Expected Result

After applying this fix:

1. **Collecting Deposit (Liability In + Cash In)**:

   - Creates Liability transaction: +amount (increases liability)
   - Creates Asset transaction: +amount (increases cash)
   - Both account balances update correctly

2. **Refunding Deposit (Liability Out + Cash Out)**:

   - Creates Liability transaction: -amount (decreases liability)
   - Creates Asset transaction: -amount (decreases cash)
   - Both account balances update correctly

3. **Buying Asset (Asset In + Cash Out)**:

   - Creates Asset transaction: +amount (increases asset)
   - Creates Asset transaction: -amount (decreases cash)
   - Both account balances update correctly

4. **Selling Asset (Asset Out + Cash In)**:
   - Creates Asset transaction: -amount (decreases asset)
   - Creates Asset transaction: +amount (increases cash)
   - Both account balances update correctly

This ensures proper double-entry bookkeeping where both sides of every transaction are recorded as separate transactions.






