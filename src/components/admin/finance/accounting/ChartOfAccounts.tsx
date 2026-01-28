
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { getAccountTypeLabel } from '@/lib/finance/accountingUtils';
import { Filter, ListFilter } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export const ChartOfAccounts: React.FC = () => {
  const { accounts, fetchAccounts, loading, error } = useAccountingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = accounts.filter(account => {
    // Apply type filter
    if (filterType !== 'all' && account.account_type !== filterType) {
      return false;
    }
    
    // Apply search term
    return (
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.description && account.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListFilter className="mr-2 h-5 w-5" />
          Chart of Accounts
        </CardTitle>
        <CardDescription>
          Complete list of accounts used in the accounting system
        </CardDescription>
        
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center space-x-2 flex-1">
            <Filter className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div className="min-w-[200px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No accounts found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map(account => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.account_type === 'asset' ? 'bg-blue-100 text-blue-800' :
                          account.account_type === 'liability' ? 'bg-red-100 text-red-800' :
                          account.account_type === 'equity' ? 'bg-purple-100 text-purple-800' :
                          account.account_type === 'revenue' ? 'bg-green-100 text-green-800' :
                          account.account_type === 'expense' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getAccountTypeLabel(account.account_type)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {account.description || '-'}
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
