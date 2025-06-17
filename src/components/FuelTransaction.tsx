
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Fuel, Calculator, Award } from 'lucide-react';

export const FuelTransaction = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loyaltyRules, setLoyaltyRules] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [availablePoints, setAvailablePoints] = useState(0);

  const [transactionData, setTransactionData] = useState({
    mobileNumber: '',
    vehicleNumber: '',
    fuelType: 'petrol' as 'petrol' | 'diesel' | 'cng',
    liters: '',
    amountPaid: '',
    pointsToRedeem: ''
  });

  useEffect(() => {
    fetchLoyaltyRules();
  }, []);

  const fetchLoyaltyRules = async () => {
    const { data } = await supabase
      .from('loyalty_rules')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (data) {
      setLoyaltyRules(data);
    }
  };

  const searchCustomer = async () => {
    if (!transactionData.mobileNumber || !transactionData.vehicleNumber) {
      toast.error('Please enter both mobile number and vehicle number');
      return;
    }

    try {
      // Find customer and vehicle
      const { data: customerVehicle, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          mobile,
          vehicles!inner(
            id,
            vehicle_number,
            vehicle_type
          )
        `)
        .eq('mobile', transactionData.mobileNumber)
        .eq('vehicles.vehicle_number', transactionData.vehicleNumber)
        .single();

      if (error || !customerVehicle) {
        toast.error('Customer or vehicle not found. Please register first.');
        setCustomerData(null);
        setAvailablePoints(0);
        return;
      }

      setCustomerData(customerVehicle);

      // Get loyalty points for this customer-vehicle combination
      const { data: pointsData } = await supabase
        .from('loyalty_points')
        .select('available_points')
        .eq('customer_id', customerVehicle.id)
        .eq('vehicle_id', customerVehicle.vehicles[0].id)
        .single();

      setAvailablePoints(pointsData?.available_points || 0);
      toast.success(`Customer found: ${customerVehicle.name || 'Unknown'}`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching customer');
    }
  };

  const calculateDiscount = () => {
    if (!loyaltyRules || !transactionData.pointsToRedeem) return 0;
    
    const pointsToRedeem = parseInt(transactionData.pointsToRedeem);
    if (pointsToRedeem > availablePoints) return 0;
    
    const discount = pointsToRedeem / loyaltyRules.points_per_rupee_discount;
    const maxDiscount = (parseFloat(transactionData.amountPaid) * loyaltyRules.max_discount_percentage) / 100;
    
    return Math.min(discount, maxDiscount);
  };

  const calculatePointsEarned = () => {
    if (!loyaltyRules || !transactionData.liters) return 0;
    
    const liters = parseFloat(transactionData.liters);
    return Math.floor(liters / loyaltyRules.liters_per_point);
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerData) {
      toast.error('Please search and select a customer first');
      return;
    }

    if (!loyaltyRules) {
      toast.error('Loyalty rules not configured');
      return;
    }

    setLoading(true);

    try {
      const pointsToRedeem = parseInt(transactionData.pointsToRedeem) || 0;
      const pointsEarned = calculatePointsEarned();
      const discount = calculateDiscount();

      if (pointsToRedeem > availablePoints) {
        toast.error('Insufficient loyalty points');
        setLoading(false);
        return;
      }

      if (pointsToRedeem > 0 && pointsToRedeem < loyaltyRules.min_points_for_redemption) {
        toast.error(`Minimum ${loyaltyRules.min_points_for_redemption} points required for redemption`);
        setLoading(false);
        return;
      }

      // Create transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerData.id,
          vehicle_id: customerData.vehicles[0].id,
          fuel_staff_id: user?.id,
          fuel_type: transactionData.fuelType,
          liters: parseFloat(transactionData.liters),
          amount_paid: parseFloat(transactionData.amountPaid),
          points_earned: pointsEarned,
          points_redeemed: pointsToRedeem,
          discount_applied: discount
        });

      if (error) throw error;

      toast.success(`Transaction completed! Points earned: ${pointsEarned}, Discount applied: ₹${discount.toFixed(2)}`);
      
      // Reset form
      setTransactionData({
        mobileNumber: '',
        vehicleNumber: '',
        fuelType: 'petrol',
        liters: '',
        amountPaid: '',
        pointsToRedeem: ''
      });
      setCustomerData(null);
      setAvailablePoints(0);
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Failed to complete transaction');
    } finally {
      setLoading(false);
    }
  };

  const discount = calculateDiscount();
  const pointsEarned = calculatePointsEarned();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="w-5 h-5" />
          Fuel Transaction
        </CardTitle>
        <CardDescription>
          Process fuel purchase and manage loyalty points
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTransaction} className="space-y-6">
          {/* Customer Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  value={transactionData.mobileNumber}
                  onChange={(e) => setTransactionData({ ...transactionData, mobileNumber: e.target.value })}
                  placeholder="Enter mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle Number</Label>
                <Input
                  id="vehicle"
                  value={transactionData.vehicleNumber}
                  onChange={(e) => setTransactionData({ ...transactionData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="Enter vehicle number"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={searchCustomer} className="w-full">
                  Search Customer
                </Button>
              </div>
            </div>

            {customerData && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customerData.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-600">{customerData.mobile} • {customerData.vehicles[0].vehicle_number}</p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {availablePoints} points
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <Select value={transactionData.fuelType} onValueChange={(value: any) => setTransactionData({ ...transactionData, fuelType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="liters">Liters</Label>
              <Input
                id="liters"
                type="number"
                step="0.001"
                value={transactionData.liters}
                onChange={(e) => setTransactionData({ ...transactionData, liters: e.target.value })}
                placeholder="Enter liters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={transactionData.amountPaid}
                onChange={(e) => setTransactionData({ ...transactionData, amountPaid: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redeem-points">Points to Redeem</Label>
              <Input
                id="redeem-points"
                type="number"
                min="0"
                max={availablePoints}
                value={transactionData.pointsToRedeem}
                onChange={(e) => setTransactionData({ ...transactionData, pointsToRedeem: e.target.value })}
                placeholder="Enter points"
              />
            </div>
          </div>

          {/* Calculation Summary */}
          {(transactionData.liters || transactionData.pointsToRedeem) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Transaction Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Points to Earn: <span className="font-medium">{pointsEarned}</span></div>
                <div>Discount: <span className="font-medium">₹{discount.toFixed(2)}</span></div>
                <div>Final Amount: <span className="font-medium">₹{(parseFloat(transactionData.amountPaid) - discount).toFixed(2)}</span></div>
                <div>Points After Transaction: <span className="font-medium">{availablePoints - (parseInt(transactionData.pointsToRedeem) || 0) + pointsEarned}</span></div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading || !customerData} className="w-full">
            {loading ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
