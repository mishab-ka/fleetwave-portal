// 1. Add these interfaces at the top
interface Liability {
  id: string;
  name: string;
  total_amount: number;
  paid_amount: number;
}

interface TransactionWithRelations extends Transaction {
  accounts: Account;
  categories: Category;
  liability_id?: string;
  is_liability_payment?: boolean;
}

// 2. Update the component state
const TransactionsSection = () => {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [selectedLiability, setSelectedLiability] = useState<string>("");

  // Add to your existing state
  const [formData, setFormData] = useState({
    // ... existing fields
    liability_id: "",
    is_liability_payment: false,
  });

  // 3. Add liability fetching
  const fetchLiabilities = async () => {
    try {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*');
      
      if (error) throw error;
      setLiabilities(data || []);
    } catch (error) {
      console.error("Error fetching liabilities:", error);
      toast.error("Failed to load liabilities");
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
    fetchLiabilities(); // Add this line
  }, []);

  // 4. Update handleAddTransaction
  const handleAddTransaction = async () => {
    try {
      // ... existing validation

      // Check if it's a liability payment
      const isLiabilityPayment = selectedCategory?.type === "liability" && formData.type === "expense";

      if (isLiabilityPayment && !formData.liability_id) {
        toast.error("Please select a liability to pay");
        return;
      }

      // Handle liability payment
      if (isLiabilityPayment) {
        // Get selected liability
        const { data: liability, error: liabilityError } = await supabase
          .from('liabilities')
          .select('*')
          .eq('id', formData.liability_id)
          .single();

        if (liabilityError || !liability) {
          throw new Error("Liability not found");
        }

        // Check remaining amount
        const remaining = liability.total_amount - liability.paid_amount;
        if (formData.amount > remaining) {
          toast.error(`Payment exceeds remaining amount: ${formatter.format(remaining)}`);
          return;
        }

        // Update account balance
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', formData.account_id)
          .single();

        if (accountError) throw accountError;

        const newBalance = account.balance - formData.amount;
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', formData.account_id);

        // Create transaction
        const { error: transactionError } = await supabase
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

        if (transactionError) throw transactionError;

        // Update liability
        const newPaidAmount = liability.paid_amount + formData.amount;
        await supabase
          .from('liabilities')
          .update({ 
            paid_amount: newPaidAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.liability_id);

        toast.success("Liability payment recorded");
        fetchTransactions();
        fetchAccounts();
        fetchLiabilities();
        setIsAddDialogOpen(false);
        resetForm();
        return;
      }

      // ... rest of your existing code for non-payment transactions

    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  // 5. Add liability selector to your form JSX
  {selectedCategory?.type === "liability" && formData.type === "expense" && (
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