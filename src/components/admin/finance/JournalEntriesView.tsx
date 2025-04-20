
import React, { useEffect, useState } from 'react';
import { useFinancialStore } from '@/stores/financialStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatter } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const JournalEntriesView: React.FC = () => {
  const { journalEntries, fetchJournalEntries } = useFinancialStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchJournalEntries();
      setLoading(false);
    };
    
    loadData();
  }, [fetchJournalEntries]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {journalEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No journal entries found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.flatMap(entry => 
                entry.journal_lines.map((line, lineIndex) => (
                  <TableRow key={`${entry.id}-${line.id || lineIndex}`}>
                    {lineIndex === 0 && (
                      <>
                        <TableCell rowSpan={entry.journal_lines.length}>
                          {formatDate(entry.entry_date)}
                        </TableCell>
                        <TableCell rowSpan={entry.journal_lines.length}>
                          {entry.description}
                        </TableCell>
                        <TableCell rowSpan={entry.journal_lines.length}>
                          {entry.reference_number || '-'}
                        </TableCell>
                        <TableCell rowSpan={entry.journal_lines.length}>
                          <Badge variant={entry.posted ? "success" : "secondary"}>
                            {entry.posted ? 'Posted' : 'Draft'}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    <TableCell>{line.account.name}</TableCell>
                    <TableCell className="text-right">
                      {line.debit_amount > 0 ? formatter.format(line.debit_amount) : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit_amount > 0 ? formatter.format(line.credit_amount) : ''}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
