
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, CreditCard, Fuel, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalCustomers: number;
  totalTransactions: number;
  totalRevenue: number;
  totalLoyaltyPoints: number;
  averageTransactionAmount: number;
  fuelTypeDistribution: { name: string; value: number; percentage: number }[];
  dailyRevenue: { date: string; revenue: number; transactions: number }[];
  topCustomers: { name: string; mobile: string; totalSpent: number; transactions: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all required data
      const [customersData, transactionsData, loyaltyData] = await Promise.all([
        supabase.from('customers').select('id, created_at'),
        supabase.from('transactions').select(`
          id, amount_paid, fuel_type, transaction_date, liters,
          customers!inner(name, mobile)
        `),
        supabase.from('loyalty_points').select('total_points, redeemed_points')
      ]);

      if (customersData.error) throw customersData.error;
      if (transactionsData.error) throw transactionsData.error;
      if (loyaltyData.error) throw loyaltyData.error;

      const customers = customersData.data || [];
      const transactions = transactionsData.data || [];
      const loyaltyPoints = loyaltyData.data || [];

      // Calculate basic metrics
      const totalCustomers = customers.length;
      const totalTransactions = transactions.length;
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount_paid, 0);
      const totalLoyaltyPoints = loyaltyPoints.reduce((sum, lp) => sum + (lp.total_points - lp.redeemed_points), 0);
      const averageTransactionAmount = totalRevenue / totalTransactions || 0;

      // Fuel type distribution
      const fuelTypes = transactions.reduce((acc, t) => {
        acc[t.fuel_type] = (acc[t.fuel_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const fuelTypeDistribution = Object.entries(fuelTypes).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
        percentage: (value / totalTransactions) * 100
      }));

      // Daily revenue for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyRevenue = last7Days.map(date => {
        const dayTransactions = transactions.filter(t => 
          t.transaction_date.split('T')[0] === date
        );
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayTransactions.reduce((sum, t) => sum + t.amount_paid, 0),
          transactions: dayTransactions.length
        };
      });

      // Top customers by spending
      const customerSpending = transactions.reduce((acc, t) => {
        const key = t.customers.mobile;
        if (!acc[key]) {
          acc[key] = {
            name: t.customers.name || 'N/A',
            mobile: t.customers.mobile,
            totalSpent: 0,
            transactions: 0
          };
        }
        acc[key].totalSpent += t.amount_paid;
        acc[key].transactions += 1;
        return acc;
      }, {} as Record<string, any>);

      const topCustomers = Object.values(customerSpending)
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      setAnalytics({
        totalCustomers,
        totalTransactions,
        totalRevenue,
        totalLoyaltyPoints,
        averageTransactionAmount,
        fuelTypeDistribution,
        dailyRevenue,
        topCustomers
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averageTransactionAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalLoyaltyPoints}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue (Last 7 Days)</CardTitle>
            <CardDescription>Revenue and transaction trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Transactions'
                  ]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fuel Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Type Distribution</CardTitle>
            <CardDescription>Breakdown by fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.fuelTypeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                >
                  {analytics.fuelTypeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Customers by total spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topCustomers.map((customer, index) => (
              <div key={customer.mobile} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.mobile}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(customer.totalSpent)}</div>
                  <div className="text-sm text-muted-foreground">{customer.transactions} transactions</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
