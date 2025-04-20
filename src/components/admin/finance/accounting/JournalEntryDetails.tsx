
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JournalEntry } from '@/types/accounting';
import { formatter, getAccountName } from '@/lib/finance/accountingUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface JournalEntryDetailsProps {
  entryId: number;
}

export const JournalEntryDetails: React.FC<JournalEntryDetailsProps> = ({ entryId }) => {
  const { getJournalEntryById, accounts, fetchAccounts } = useAccountingStore();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntry = async () => {
      setLoading(true);
      if (accounts.length === 0) {
        await fetchAccounts();
      }
      const journalEntry = await getJournalEntryById(entryId);
      setEntry(journalEntry);
      setLoading(false);
    };

    loadEntry();
  }, [entryId, getJournalEntryById, accounts.length, fetchAccounts]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!entry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Not Found</CardTitle>
          <CardDescription>The requested journal entry could not be found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate totals
  const totalDebits = entry.journal_lines?.reduce(
    (sum, line) => sum + (line.debit_amount || 0), 
    0
  ) || 0;
  
  const totalCredits = entry.journal_lines?.reduce(
    (sum, line) => sum + (line.credit_amount || 0), 
    0
  ) || 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Entry #{entry.id}</CardTitle>
        <CardDescription>
          Date: {formatDate(entry.entry_date)} | 
          Reference: {entry.reference_number || 'N/A'} | 
          Status: {entry.is_posted ? 'Posted' : 'Draft'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Description</h3>
          <p className="text-gray-700">{entry.description}</p>
        </div>

        <h3 className="text-lg font-medium mb-2">Journal Lines</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.journal_lines?.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.account ? 
                  `${line.account.code} - ${line.account.name}` : 
                  getAccountName(accounts, line.account_id)
                }</TableCell>
                <TableCell>{line.description || '-'}</TableCell>
                <TableCell className="text-right">
                  {line.debit_amount > 0 ? formatter.format(line.debit_amount) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {line.credit_amount > 0 ? formatter.format(line.credit_amount) : '-'}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>Totals</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">{formatter.format(totalDebits)}</TableCell>
              <TableCell className="text-right">{formatter.format(totalCredits)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {totalDebits !== totalCredits && (
          <div className="mt-4 p-2 bg-red-100 text-red-800 rounded">
            <strong>Warning:</strong> This journal entry is not balanced. 
            Debits: {formatter.format(totalDebits)}, 
            Credits: {formatter.format(totalCredits)},
            Difference: {formatter.format(Math.abs(totalDebits - totalCredits))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
