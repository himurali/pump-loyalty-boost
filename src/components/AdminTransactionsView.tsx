
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CreditCard, Fuel, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  liters: number;
  amount_paid: number;
  fuel_type: string;
  points_earned: number;
  points_redeemed: number;
  discount_applied: number;
  transaction_date: string;
  customer_id: string;
  vehicle_id: string;
  customers: {
    name: string | null;
    mobile: string;
  } | null;
  vehicles: {
    vehicle_number: string;
    vehicle_type: string;
  } | null;
}

export const AdminTransactionsView = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          console.log('Transaction change detected, refreshing data...');
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      console.log('Fetching transactions...');
      
      // First, let's check if we have any transactions at all
      const { data: allTransactions, error: countError } = await supabase
        .from('transactions')
        .select('id, customer_id, vehicle_id')
        .limit(10);

      console.log('All transactions count check:', allTransactions);
      
      if (countError) {
        console.error('Error counting transactions:', countError);
      }

      // Now fetch with joins
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          liters,
          amount_paid,
          fuel_type,
          points_earned,
          points_redeemed,
          discount_applied,
          transaction_date,
          customer_id,
          vehicle_id,
          customers (
            name,
            mobile
          ),
          vehicles (
            vehicle_number,
            vehicle_type
          )
        `)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions with joins:', error);
        throw error;
      }

      console.log('Fetched transactions with joins:', data);
      console.log('Number of transactions:', data?.length || 0);
      
      // Let's also check customers and vehicles separately
      const { data: customers } = await supabase
        .from('customers')
        .select('*');
      
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*');
      
      console.log('Available customers:', customers);
      console.log('Available vehicles:', vehicles);

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const customer = transaction.customers;
    const vehicle = transaction.vehicles;
    
    const matchesSearch = 
      customer?.mobile?.includes(searchTerm) ||
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFuelType = fuelTypeFilter === 'all' || transaction.fuel_type === fuelTypeFilter;
    
    return matchesSearch && matchesFuelType;
  });

  // Calculate summary statistics
  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount_paid), 0);
  const totalLiters = transactions.reduce((sum, t) => sum + Number(t.liters), 0);
  const totalPointsEarned = transactions.reduce((sum, t) => sum + t.points_earned, 0);

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-4">
          <p className="text-sm text-yellow-800">
            Debug: Found {totalTransactions} transactions. Check console for detailed logs.
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Recent transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fuel Sold</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiters.toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Liters dispensed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Badge className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPointsEarned}</div>
            <p className="text-xs text-muted-foreground">
              Loyalty points awarded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and analyze all fuel transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchTransactions} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Fuel Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        <div>
                          <div>{new Date(transaction.transaction_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {transaction.customers?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.customers?.mobile || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.vehicles?.vehicle_number || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {transaction.vehicles?.vehicle_type?.replace('_', ' ') || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          <span className="font-medium">{Number(transaction.liters).toFixed(2)}L</span>
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {transaction.fuel_type.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{formatCurrency(Number(transaction.amount_paid))}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        {transaction.points_earned > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{transaction.points_earned}
                          </Badge>
                        )}
                        {transaction.points_redeemed > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            -{transaction.points_redeemed}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(transaction.discount_applied) > 0 ? (
                        <Badge variant="default" className="text-xs">
                          -{formatCurrency(Number(transaction.discount_applied))}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!loading && filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || fuelTypeFilter !== 'all' 
                ? "No transactions found matching your filters." 
                : "No transactions recorded yet."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
