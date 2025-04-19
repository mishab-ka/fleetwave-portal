
import React, { useEffect } from 'react';
import { useFinancialStore } from '@/stores/financialStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatter } from '@/lib/utils';

export const JournalEntriesView: React.FC = () => {
  const { journalEntries, fetchJournalEntries } = useFinancialStore();

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Debit</TableHead>
          <TableHead>Credit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {journalEntries.flatMap(entry => 
          entry.journal_lines.map(line => (
            <TableRow key={line.id}>
              <TableCell>{entry.entry_date}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell>{line.account.name}</TableCell>
              <TableCell>{formatter.format(line.debit_amount)}</TableCell>
              <TableCell>{formatter.format(line.credit_amount)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
