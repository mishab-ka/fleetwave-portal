
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatter } from '@/lib/utils';
import { Account, Transaction } from '@/types/accounting';

interface BalanceItem {
  category: string;
  amount: number;
  type: 'asset' | 'liability';
}

const BalanceSheet = () => {
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['balance-sheet-assets'],
    queryFn: async () => {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*');

      const { data: assetTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'Asset');

      if (accountsError || transactionsError) throw accountsError || transactionsError;

      let balanceItems: BalanceItem[] = [];
      
      // Add bank account balances
      if (accountsData) {
        balanceItems = accountsData.map(account => ({
          category: account.name,
          amount: account.balance || 0,
          type: 'asset'
        }));
      }
      
      // Add asset transactions
      if (assetTransactions) {
        // Group assets by category (description)
        const assetGroups = assetTransactions.reduce((acc, asset: Transaction) => {
          const category = asset.description?.split(' - ')[0] || 'Other Assets';
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += asset.amount;
          return acc;
        }, {});
        
        // Add grouped assets to balance items
        Object.entries(assetGroups).forEach(([category, amount]) => {
          balanceItems.push({
            category,
            amount: amount as number,
            type: 'asset'
          });
        });
      }

      return balanceItems;
    }
  });

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useQuery({
    queryKey: ['balance-sheet-liabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'Liability');

      if (error) throw error;

      // Group liabilities by category (first part of description)
      const groupedLiabilities = (data || []).reduce((acc, transaction: Transaction) => {
        const descParts = transaction.description?.split(' - ') || [];
        const key = descParts[0] || 'Other Liabilities';
        
        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key] += Math.abs(transaction.amount);
        return acc;
      }, {});

      return Object.entries(groupedLiabilities).map(([category, amount]) => ({
        category,
        amount: amount as number,
        type: 'liability'
      }));
    }
  });

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  if (assetsLoading || liabilitiesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold">Balance Sheet</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-green-600">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalAssets)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-red-600">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalLiabilities)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-blue-600">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatter.format(netWorth)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{item.category}</td>
                      <td className="p-2 text-right font-medium text-green-600">
                        {formatter.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-gray-500">
                        No assets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilities.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{item.category}</td>
                      <td className="p-2 text-right font-medium text-red-600">
                        {formatter.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {liabilities.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-gray-500">
                        No liabilities found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BalanceSheet;
