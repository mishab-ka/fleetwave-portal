
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAccountingStore } from '@/stores/accountingStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AccountingAccount } from '@/types/accounting';

const formSchema = z.object({
  transaction_date: z.date({
    required_error: "Transaction date is required",
  }),
  description: z.string().min(3, {
    message: "Description must be at least 3 characters",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number",
  }),
  transaction_type: z.enum(['income', 'expense', 'transfer'], {
    required_error: "Transaction type is required",
  }),
  category: z.string().optional(),
  account_from_id: z.string().uuid().optional(),
  account_to_id: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const AccountingTransactionForm: React.FC = () => {
  const { accounts, fetchAccounts, addTransaction } = useAccountingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter accounts by type
  const [fromAccountOptions, setFromAccountOptions] = useState<AccountingAccount[]>([]);
  const [toAccountOptions, setToAccountOptions] = useState<AccountingAccount[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: new Date(),
      description: '',
      amount: undefined,
      transaction_type: 'income',
      category: '',
      account_from_id: undefined,
      account_to_id: undefined,
    },
  });

  const transactionType = form.watch('transaction_type');

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Update account options based on transaction type
  useEffect(() => {
    if (accounts.length === 0) return;

    switch(transactionType) {
      case 'income':
        // From: Revenue accounts
        setFromAccountOptions(accounts.filter(acc => acc.account_type === 'revenue'));
        // To: Asset (cash) accounts
        setToAccountOptions(accounts.filter(acc => acc.account_type === 'asset' && acc.code.startsWith('11')));
        break;
      case 'expense':
        // From: Asset (cash) accounts
        setFromAccountOptions(accounts.filter(acc => acc.account_type === 'asset' && acc.code.startsWith('11')));
        // To: Expense accounts
        setToAccountOptions(accounts.filter(acc => acc.account_type === 'expense'));
        break;
      case 'transfer':
        // Both from and to: Asset accounts
        const assetAccounts = accounts.filter(acc => acc.account_type === 'asset');
        setFromAccountOptions(assetAccounts);
        setToAccountOptions(assetAccounts);
        break;
    }
  }, [transactionType, accounts]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Validate account selection based on transaction type
      if (!values.account_from_id) {
        toast.error(`Please select ${transactionType === 'income' ? 'a revenue account' : 'a source account'}`);
        setIsSubmitting(false);
        return;
      }
      
      if (!values.account_to_id) {
        toast.error(`Please select ${transactionType === 'expense' ? 'an expense account' : 'a destination account'}`);
        setIsSubmitting(false);
        return;
      }
      
      // Format date for API
      const formattedValues = {
        transaction_date: format(values.transaction_date, 'yyyy-MM-dd'),
        description: values.description,
        amount: values.amount,
        transaction_type: values.transaction_type,
        category: values.category,
        account_from_id: values.account_from_id, // Pass as string (UUID)
        account_to_id: values.account_to_id, // Pass as string (UUID)
      };
      
      const transactionId = await addTransaction(formattedValues);
      
      if (transactionId) {
        toast.success('Transaction created successfully');
        form.reset({
          transaction_date: new Date(),
          description: '',
          amount: undefined,
          transaction_type: 'income',
          category: '',
          account_from_id: undefined,
          account_to_id: undefined,
        });
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      toast.error('Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getFromAccountLabel = () => {
    switch(transactionType) {
      case 'income': return 'Revenue Account';
      case 'expense': return 'Source Account';
      case 'transfer': return 'From Account';
      default: return 'From Account';
    }
  };
  
  const getToAccountLabel = () => {
    switch(transactionType) {
      case 'income': return 'Destination Account';
      case 'expense': return 'Expense Account';
      case 'transfer': return 'To Account';
      default: return 'To Account';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Transaction Date */}
        <FormField
          control={form.control}
          name="transaction_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Transaction Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Select date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Enter transaction description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Transaction Type */}
        <FormField
          control={form.control}
          name="transaction_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* From Account */}
        <FormField
          control={form.control}
          name="account_from_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getFromAccountLabel()}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${getFromAccountLabel().toLowerCase()}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fromAccountOptions.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* To Account */}
        <FormField
          control={form.control}
          name="account_to_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getToAccountLabel()}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${getToAccountLabel().toLowerCase()}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {toAccountOptions.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Processing...' : 'Create Transaction'}
        </Button>
      </form>
    </Form>
  );
};
