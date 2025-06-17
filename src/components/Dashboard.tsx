
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerRegistration } from './CustomerRegistration';
import { FuelTransaction } from './FuelTransaction';
import { LogOut, User, Fuel, UserPlus } from 'lucide-react';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCustomerRegistered = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Fuel className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Fuel Station System</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Fuel Station Management</h2>
            <p className="text-gray-600">Manage customer registrations and fuel transactions with loyalty points</p>
          </div>

          <Tabs defaultValue="transaction" className="space-y-6">
            <TabsList>
              <TabsTrigger value="transaction" className="flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                Fuel Transaction
              </TabsTrigger>
              <TabsTrigger value="registration" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Customer Registration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transaction" key={refreshKey}>
              <FuelTransaction />
            </TabsContent>

            <TabsContent value="registration">
              <CustomerRegistration onCustomerRegistered={handleCustomerRegistered} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};
