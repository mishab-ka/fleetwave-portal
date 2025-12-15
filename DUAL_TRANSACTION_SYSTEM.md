# Dual Transaction System for Assets & Liabilities

## Overview

The dual transaction system has been implemented for both **Assets** and **Liabilities** in the Transactions Section. This system automatically activates when you select either "Asset" or "Liability" as the transaction type.

## How It Works

### For Assets

When you select **Asset** as the transaction type, the dual transaction system automatically activates and provides two options:

#### 1. Asset In (Purchase/Acquire) + Cash Out

- **Asset In**: Increases your asset value by the specified amount
- **Cash Out**: Decreases the selected bank account by the same amount
- **Example**: Purchasing equipment for $1,000
  - Asset: +$1,000 (increases)
  - Bank Account: -$1,000 (decreases)
- **Result**: Only ONE asset transaction is created, and the bank account balance is directly updated

#### 2. Asset Out (Sell/Dispose) + Cash In

- **Asset Out**: Decreases your asset value by the specified amount
- **Cash In**: Increases the selected bank account by the same amount
- **Example**: Selling equipment for $1,000
  - Asset: -$1,000 (decreases)
  - Bank Account: +$1,000 (increases)
- **Result**: Only ONE asset transaction is created, and the bank account balance is directly updated

### For Liabilities

When you select **Liability** as the transaction type, the dual transaction system automatically activates and provides two options:

#### 1. Liability In (Incur Debt) + Cash In

- **Liability In**: Increases your liability (debt) by the specified amount
- **Cash In**: Increases the selected bank account by the same amount
- **Example**: Taking a loan of $5,000
  - Liability: +$5,000 (debt increases)
  - Bank Account: +$5,000 (cash increases)
- **Result**: Only ONE liability transaction is created, and the bank account balance is directly updated

#### 2. Liability Out (Pay Debt) + Cash Out

- **Liability Out**: Decreases your liability (debt paid) by the specified amount
- **Cash Out**: Decreases the selected bank account by the same amount
- **Example**: Repaying a loan of $2,000
  - Liability: -$2,000 (debt decreases)
  - Bank Account: -$2,000 (cash decreases)
- **Result**: Only ONE liability transaction is created, and the bank account balance is directly updated

## Key Features

### 1. Automatic Mode Selection

- When you select "Asset" or "Liability" as the transaction type, the dual transaction mode is **automatically activated**
- No need to manually select transaction mode for assets/liabilities
- The transaction mode selector is hidden for asset/liability types

### 2. Smart Validation

- Checks if the selected bank account has sufficient balance for "Cash Out" transactions
- Prevents negative balance errors
- Shows clear error messages for missing fields

### 3. Transaction Flow Indicator

- Visual indicator shows exactly what will happen with your transaction
- Displays both the asset/liability change and the cash change
- Updates in real-time as you change selections

### 4. Single Transaction Entry

- Unlike traditional double-entry systems that create two separate transactions, this system:
  - Creates only **ONE** asset/liability transaction
  - Directly updates the bank account balance
  - No duplicate "expense" or "income" entries
  - Keeps your transaction list clean and organized

## UI Flow

1. **Select Type**: Choose "Asset" or "Liability" (dual mode automatically activates)
2. **Enter Amount**: Specify the transaction amount
3. **Select Asset/Liability Transaction**: Choose In (increase) or Out (decrease)
4. **Select Cash Transaction**: Choose Out (payment) or In (receipt)
5. **View Transaction Flow**: See a preview of the changes
6. **Select Cash Account**: Choose which bank account to use
7. **Select Category**: Choose the appropriate category for your asset/liability (e.g., "Vehicle", "Equipment", "Loan", "Credit Card")
   - **Main Category**: Select the primary category type
   - **Subcategory** (Optional): Select a more specific subcategory if available
8. **Submit**: The system creates one transaction with the selected category and updates the account balance

## Benefits

- ✅ **Simplified Entry**: No need to manually create two separate transactions
- ✅ **Accurate Balance**: Bank account balances are automatically updated
- ✅ **Double-Entry Compliance**: Follows accounting principles (debit/credit)
- ✅ **Clean Transaction History**: Only one transaction per action
- ✅ **Intuitive UI**: Clear labels and visual indicators
- ✅ **Error Prevention**: Balance checks prevent insufficient funds errors
- ✅ **Flexible**: Works for both assets and liabilities with the same interface
- ✅ **Categorized**: All transactions are properly categorized for better reporting
- ✅ **Subcategory Support**: Optional subcategory selection for detailed classification

## Important Notes

- For **Income** and **Expense** transactions, you can still choose between single or dual transaction modes
- The dual transaction system is **mandatory** for assets and liabilities
- All transactions are stored with proper type classification (asset/liability)
- Account balances are updated in real-time
- The system prevents zero-amount transactions
