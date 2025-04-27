// 2. Update the TransactionsSection component:

const TransactionsSection = () => {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [selectedLiability, setSelectedLiability] = useState<string>("");

  interface Liability {
    id: string;
    name: string;
    total_amount: number;
    paid_amount: number;
  }

  const fetchLiabilities = async () => {
    const { data, error } = await supabase
      .from('liabilities')
      .select('*');
    if (data) setLiabilities(data);
  };

  useEffect(() => {
    fetchLiabilities();
  }, []);

  // In your form state, add:
  const [formData, setFormData] = useState({
    // ... existing fields
    liability_id: "",
    is_liability_payment: false,
  });

  // In handleAddTransaction:
  const handleAddTransaction = async () => {
    if (formData.is_liability_payment && !formData.liability_id) {
      toast.error("Please select a liability to pay");
      return;
    }

    // Handle liability payment
    if (formData.type === 'expense' && selectedCategory?.type === 'liability') {
      try {
        // 1. Update bank account
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', formData.account_id)
          .single();

        const newBalance = account.balance - formData.amount;
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', formData.account_id);

        // 2. Create transaction
        const { data: transaction, error } = await supabase
          .from('transactions')
          .insert([{
            description: formData.description,
            amount: -formData.amount,
            type: 'expense',
            date: formData.date.toISOString(),
            account_id: formData.account_id,
            category_id: formData.category_id,
            liability_id: formData.liability_id,
            is_liability_payment: true
          }]);

        // 3. Update liability
        const { data: liability } = await supabase
          .from('liabilities')
          .select('*')
          .eq('id', formData.liability_id)
          .single();

        const newPaid = Math.min(
          liability.paid_amount + formData.amount,
          liability.total_amount
        );

        await supabase
          .from('liabilities')
          .update({ 
            paid_amount: newPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.liability_id);

        toast.success("Liability payment recorded");
        fetchTransactions();
        fetchAccounts();
        fetchLiabilities();
        
      } catch (error) {
        toast.error("Payment failed");
        console.error(error);
      }
      return;
    }

    // ... rest of your existing code
  };

  // In your form JSX, add liability selector when paying liability:
  {selectedCategory?.type === 'liability' && formData.type === 'expense' && (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">Liability</Label>
      <Select
        value={formData.liability_id}
        onValueChange={(value) => setFormData(prev => ({
          ...prev,
          liability_id: value,
          is_liability_payment: true
        }))}
      >
        <SelectTrigger className="col-span-3">
          <SelectValue placeholder="Select liability" />
        </SelectTrigger>
        <SelectContent>
          {liabilities
            .filter(l => l.paid_amount < l.total_amount)
            .map(liability => (
              <SelectItem key={liability.id} value={liability.id}>
                {liability.name} (Remaining: {
                  formatter.format(liability.total_amount - liability.paid_amount)
                })
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )}