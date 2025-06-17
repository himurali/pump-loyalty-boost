
-- Create enum types for better data integrity
CREATE TYPE public.user_role AS ENUM ('admin', 'fuel_staff');
CREATE TYPE public.vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'auto_rickshaw', 'other');
CREATE TYPE public.fuel_type AS ENUM ('petrol', 'diesel', 'cng');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'fuel_staff',
  pump_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  mobile TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(customer_id, vehicle_number)
);

-- Create loyalty_rules table for configurable rules
CREATE TABLE public.loyalty_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  liters_per_point DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  points_per_rupee_discount DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  min_points_for_redemption INTEGER NOT NULL DEFAULT 100,
  max_discount_percentage DECIMAL(4,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fuel_staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  fuel_type fuel_type NOT NULL,
  liters DECIMAL(8,3) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create loyalty_points table for tracking points balance
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  redeemed_points INTEGER NOT NULL DEFAULT 0,
  available_points INTEGER GENERATED ALWAYS AS (total_points - redeemed_points) STORED,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(customer_id, vehicle_id)
);

-- Insert default loyalty rule
INSERT INTO public.loyalty_rules (rule_name, liters_per_point, points_per_rupee_discount, min_points_for_redemption, max_discount_percentage)
VALUES ('Default Rule', 1.00, 1.00, 100, 10.00);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for customers (fuel staff can manage all customers)
CREATE POLICY "Fuel staff can view all customers" ON public.customers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

CREATE POLICY "Fuel staff can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

CREATE POLICY "Fuel staff can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

-- RLS Policies for vehicles
CREATE POLICY "Fuel staff can manage all vehicles" ON public.vehicles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

-- RLS Policies for loyalty_rules (admin can manage, fuel staff can read)
CREATE POLICY "All authenticated users can view loyalty rules" ON public.loyalty_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage loyalty rules" ON public.loyalty_rules
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for transactions
CREATE POLICY "Fuel staff can manage all transactions" ON public.transactions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

-- RLS Policies for loyalty_points
CREATE POLICY "Fuel staff can manage all loyalty points" ON public.loyalty_points
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fuel_staff')
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, mobile, role, pump_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Fuel Staff'),
    COALESCE(NEW.raw_user_meta_data ->> 'mobile', NEW.phone),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'fuel_staff'),
    COALESCE(NEW.raw_user_meta_data ->> 'pump_id', 'PUMP001')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update loyalty points after transaction
CREATE OR REPLACE FUNCTION public.update_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  rule_record RECORD;
BEGIN
  -- Get the active loyalty rule
  SELECT * INTO rule_record FROM public.loyalty_rules WHERE is_active = true LIMIT 1;
  
  IF rule_record IS NULL THEN
    RAISE EXCEPTION 'No active loyalty rule found';
  END IF;

  -- Update or insert loyalty points
  INSERT INTO public.loyalty_points (customer_id, vehicle_id, total_points, redeemed_points)
  VALUES (NEW.customer_id, NEW.vehicle_id, NEW.points_earned, NEW.points_redeemed)
  ON CONFLICT (customer_id, vehicle_id)
  DO UPDATE SET
    total_points = loyalty_points.total_points + NEW.points_earned,
    redeemed_points = loyalty_points.redeemed_points + NEW.points_redeemed,
    last_updated = now();

  RETURN NEW;
END;
$$;

-- Create trigger to update loyalty points after transaction
CREATE TRIGGER update_loyalty_points_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_points();
