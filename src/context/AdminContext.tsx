
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

type AdminContextType = {
  isAdmin: boolean;
  loading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Get the user from the users table
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Check if user role is admin
        const isUserAdmin = data?.role === 'admin' || user.email === 'mishabrock8@gmail.com';
        setIsAdmin(isUserAdmin);
        
        if (!isUserAdmin) {
          // Set the user to admin if email is mishabrock8@gmail.com
          if (user.email === 'mishabrock8@gmail.com') {
            const { error: updateError } = await supabase
              .from('users')
              .update({ role: 'admin' })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('Error updating role:', updateError);
            } else {
              setIsAdmin(true);
              toast.success('Admin role granted');
            }
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        
        // Special case for mishabrock8@gmail.com
        if (user.email === 'mishabrock8@gmail.com') {
          setIsAdmin(true);
          toast.success('Admin access granted');
        } else {
          toast.error('Failed to verify admin privileges');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const value = {
    isAdmin,
    loading,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
