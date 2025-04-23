
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatter } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, CreditCard, TrendingDown, TrendingUp } from 'lucide-react';

export const FinancialOverview = () => {
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: liabilities = [] } = useQuery({
    queryKey: ['liabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.value || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets ? (totalLiabilities / totalAssets) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-800">Total Assets</CardTitle>
          <Building2 className="h-5 w-5 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-900">{formatter.format(totalAssets)}</div>
          <div className="flex items-center text-xs text-emerald-600 mt-2">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>{assets.length} assets tracked</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-rose-100 to-rose-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-rose-800">Total Liabilities</CardTitle>
          <CreditCard className="h-5 w-5 text-rose-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-900">{formatter.format(totalLiabilities)}</div>
          <div className="flex items-center text-xs text-rose-600 mt-2">
            <TrendingDown className="h-4 w-4 mr-1" />
            <span>{liabilities.length} liabilities tracked</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-violet-100 to-violet-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-violet-800">Net Worth</CardTitle>
          <Building2 className="h-5 w-5 text-violet-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-900">{formatter.format(netWorth)}</div>
          <div className="flex items-center text-xs text-violet-600 mt-2">
            {netWorth >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            <span>Current financial position</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-sky-100 to-sky-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-800">Debt to Asset Ratio</CardTitle>
          <CreditCard className="h-5 w-5 text-sky-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-900">{debtToAssetRatio.toFixed(2)}%</div>
          <div className="flex items-center text-xs text-sky-600 mt-2">
            {debtToAssetRatio <= 50 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            <span>Financial health indicator</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
