
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface CustomerRegistrationProps {
  onCustomerRegistered: () => void;
}

export const CustomerRegistration = ({ onCustomerRegistered }: CustomerRegistrationProps) => {
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState({
    mobile: '',
    name: '',
    email: '',
    vehicleNumber: '',
    vehicleType: 'car' as 'car' | 'motorcycle' | 'truck' | 'auto_rickshaw' | 'other'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile', customerData.mobile)
        .single();

      let customerId;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        toast.info('Customer already exists, registering vehicle...');
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            mobile: customerData.mobile,
            name: customerData.name,
            email: customerData.email || null
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        toast.success('New customer registered!');
      }

      // Check if vehicle already exists for this customer
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('customer_id', customerId)
        .eq('vehicle_number', customerData.vehicleNumber)
        .single();

      if (existingVehicle) {
        toast.error('This vehicle is already registered for this customer');
        setLoading(false);
        return;
      }

      // Register vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customerId,
          vehicle_number: customerData.vehicleNumber,
          vehicle_type: customerData.vehicleType
        });

      if (vehicleError) throw vehicleError;

      toast.success('Vehicle registered successfully!');
      setCustomerData({
        mobile: '',
        name: '',
        email: '',
        vehicleNumber: '',
        vehicleType: 'car'
      });
      onCustomerRegistered();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register customer/vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Register Customer & Vehicle
        </CardTitle>
        <CardDescription>
          Register a new customer or add a vehicle to existing customer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={customerData.mobile}
                onChange={(e) => setCustomerData({ ...customerData, mobile: e.target.value })}
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-number">Vehicle Number *</Label>
              <Input
                id="vehicle-number"
                value={customerData.vehicleNumber}
                onChange={(e) => setCustomerData({ ...customerData, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., KA01AB1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle Type</Label>
              <Select value={customerData.vehicleType} onValueChange={(value: any) => setCustomerData({ ...customerData, vehicleType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="auto_rickshaw">Auto Rickshaw</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Registering...' : 'Register Customer & Vehicle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
