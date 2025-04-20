
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { JournalEntryDetails } from './JournalEntryDetails';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Filter, AlertCircle } from 'lucide-react';

export const JournalEntriesList: React.FC = () => {
  const { journalEntries, fetchJournalEntries, loading, error } = useAccountingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredEntries = journalEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.id.toString().includes(searchTerm)
  );

  const handleViewDetails = (entryId: number) => {
    setSelectedEntry(entryId);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Journal Entries
        </CardTitle>
        <CardDescription>View all journal entries in the accounting system</CardDescription>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by description, reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No journal entries found matching your search criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.id}</TableCell>
                      <TableCell>{formatDate(entry.entry_date)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell>{entry.reference_number || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.is_posted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.is_posted ? 'Posted' : 'Draft'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={isDialogOpen && selectedEntry === entry.id} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(entry.id)}
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            {selectedEntry && <JournalEntryDetails entryId={selectedEntry} />}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
