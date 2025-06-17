
-- Fix the user_role enum type issue
-- First drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'fuel_staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recreate the function with proper error handling
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
    COALESCE(NEW.raw_user_meta_data ->> 'mobile', NEW.phone, '0000000000'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'fuel_staff'::public.user_role),
    COALESCE(NEW.raw_user_meta_data ->> 'pump_id', 'PUMP001')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
