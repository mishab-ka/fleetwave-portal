// FIXED DUAL TRANSACTION LOGIC - REPLACE THE EXISTING handleAddTransaction FUNCTION

const handleAddTransaction = async () => {
  try {
    // Validation for dual transaction mode
    if (formData.transaction_mode === "dual") {
      if (
        !formData.description ||
        !formData.amount ||
        !formData.date ||
        !formData.payment_account_id ||
        !formData.main_category_id
      ) {
        toast.error(
          "Please fill all required fields including category for dual transaction"
        );
        return;
      }
    } else {
      // Validation for single transaction mode
      if (
        !formData.description ||
        !formData.amount ||
        !formData.date ||
        !formData.account_id ||
        !formData.main_category_id
      ) {
        toast.error("Please fill all required fields");
        return;
      }
    }

    // Validate amount is not zero
    if (parseFloat(formData.amount.toString()) === 0) {
      toast.error("Amount cannot be zero");
      return;
    }

    const amount = parseFloat(formData.amount.toString());

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
              formData.cash_transaction_type === "cash_out"
                ? "Payment"
                : "Receipt"
            } for Asset - ${formData.description}`
          : `Cash ${
              formData.cash_transaction_type === "cash_out"
                ? "Payment"
                : "Receipt"
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
              formData.asset_transaction_type === "asset_in"
                ? "purchased"
                : "sold"
            } and cash transaction recorded successfully`
          : `Liability ${
              formData.asset_transaction_type === "asset_in"
                ? "incurred"
                : "paid"
            } and cash transaction recorded successfully`;

      toast.success(successMessage);
    } else {
      // Single transaction logic (existing logic - unchanged)
      const accountId = formData.account_id;
      // Use subcategory if selected, otherwise use main category
      const categoryId =
        formData.category_id && formData.category_id !== "none"
          ? formData.category_id
          : formData.main_category_id;

      // Fetch selected category
      const { data: selectedCategory, error: categoryError } = await supabase
        .from("categories")
        .select("type")
        .eq("id", categoryId)
        .single();

      if (categoryError || !selectedCategory) {
        throw new Error("Category not found");
      }

      // Calculate transaction amount based on type and direction
      let transactionAmount = 0;
      if (formData.type === "income") {
        transactionAmount = Math.abs(amount); // Income is always positive
      } else if (formData.type === "expense") {
        transactionAmount = -Math.abs(amount); // Expense is always negative
      } else if (formData.type === "asset") {
        // For assets, use the direction selector
        transactionAmount =
          formData.amount_direction === "+"
            ? Math.abs(amount)
            : -Math.abs(amount);
      } else if (formData.type === "liability") {
        // For liabilities, use the direction selector
        // + direction: adds to liability (negative amount)
        // - direction: reduces liability (positive amount)
        transactionAmount =
          formData.amount_direction === "+"
            ? -Math.abs(amount) // Adding to liability (negative)
            : Math.abs(amount); // Reducing liability (positive)
      }

      // Validate final transaction amount is not zero
      if (transactionAmount === 0) {
        toast.error("Calculated transaction amount cannot be zero");
        return;
      }

      // Insert transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            description: formData.description,
            amount: transactionAmount,
            type: formData.type,
            date: formData.date.toISOString(),
            account_id: accountId,
            category_id: categoryId,
          },
        ])
        .select();

      if (transactionError) throw transactionError;

      // Update account balance
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single();

      if (accountError) throw accountError;

      const newBalance = accountData.balance + transactionAmount;
      await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", accountId);

      toast.success("Transaction added successfully");
    }

    fetchTransactions();
    fetchAccounts();
    setIsAddDialogOpen(false);
    resetForm();

    // Trigger refresh for Assets & Liabilities section
    onTransactionAdded?.();
  } catch (error) {
    console.error("Error adding transaction:", error);
    toast.error("Failed to add transaction");
  }
};






