
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialStore } from '@/stores/financialStore';
import { toast } from 'sonner';

interface TransactionFormData {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  account_id?: number;
  category_id?: number;
}

export const TransactionForm: React.FC = () => {
  const { register, handleSubmit, reset, control } = useForm<TransactionFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      type: 'income'
    }
  });
  const { chartOfAccounts } = useFinancialStore();

  const onSubmit = async (data: TransactionFormData) => {
    try {
      console.log("Submitting transaction with data:", data);
      
      const { data: transactionData, error } = await supabase
        .from('transactions')
        .insert({
          date: data.date,
          description: data.description,
          amount: data.amount,
          type: data.type, // Ensure this is correctly set
          account_id: data.account_id,
          category_id: data.category_id
        })
        .select();

      if (error) throw error;

      toast.success('Transaction added successfully');
      reset();
    } catch (error) {
      toast.error('Failed to add transaction');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input 
        type="date" 
        {...register('date', { required: true })} 
        placeholder="Transaction Date" 
      />
      <Input 
        {...register('description', { required: true })} 
        placeholder="Description" 
      />
      <Input 
        type="number" 
        {...register('amount', { required: true, valueAsNumber: true })} 
        placeholder="Amount" 
      />
      
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Select 
            onValueChange={field.onChange} 
            defaultValue={field.value}
          >
            <SelectTrigger>
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      
      <Button type="submit">Add Transaction</Button>
    </form>
  );
};
