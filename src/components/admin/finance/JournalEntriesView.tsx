
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent } from '@/components/ui/card';
import { JournalEntry } from '@/types/accounting';
import { formatter } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

export const JournalEntriesView: React.FC = () => {
  const { journalEntries, fetchJournalEntries, getAccountById } = useAccountingStore();
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      await fetchJournalEntries();
      setLoading(false);
    };
    
    loadData();
  }, [fetchJournalEntries]);
  
  const toggleExpanded = (id: number) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {journalEntries.length > 0 ? (
        journalEntries.map((entry) => (
          <Card key={entry.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpanded(entry.id)}
              >
                <div>
                  <p className="font-semibold">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(entry.entry_date), 'MMM d, yyyy')} • Entry #{entry.id}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="mr-2 text-sm font-medium">
                    {expandedEntry === entry.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </span>
                </div>
              </div>
              
              {expandedEntry === entry.id && entry.journal_lines && (
                <div className="border-t p-4">
                  <div className="grid grid-cols-3 gap-4 font-medium text-muted-foreground mb-2">
                    <div>Account</div>
                    <div className="text-right">Debit</div>
                    <div className="text-right">Credit</div>
                  </div>
                  
                  {entry.journal_lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-3 gap-4 text-sm py-2 border-t">
                      <div>{getAccountById(line.account_id)?.name || line.account_id}</div>
                      <div className="text-right">
                        {line.debit_amount > 0 ? formatter.format(line.debit_amount) : ''}
                      </div>
                      <div className="text-right">
                        {line.credit_amount > 0 ? formatter.format(line.credit_amount) : ''}
                      </div>
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-3 gap-4 font-semibold py-2 border-t">
                    <div>Total</div>
                    <div className="text-right">
                      {formatter.format(
                        entry.journal_lines.reduce((sum, line) => sum + line.debit_amount, 0)
                      )}
                    </div>
                    <div className="text-right">
                      {formatter.format(
                        entry.journal_lines.reduce((sum, line) => sum + line.credit_amount, 0)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <div className="flex justify-center mb-3">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No journal entries yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a transaction to create journal entries.
          </p>
        </div>
      )}
    </div>
  );
};
