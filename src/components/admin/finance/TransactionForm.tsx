
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export const TransactionForm = () => {
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await supabase
      .from('driver_balance_transactions')
      .insert([
        {
          amount,
          description,
          created_by: 'system', // This should be replaced with actual user ID
          type: 'due',
          user_id: 'system' // This should be replaced with actual user ID
        }
      ]);

    if (error) {
      console.error('Error creating transaction:', error);
    } else {
      setAmount(0);
      setDescription('');
      // You might want to add a success toast here
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Amount"
          required
        />
      </div>
      <div>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          required
        />
      </div>
      <Button type="submit">Create Transaction</Button>
    </form>
  );
};
