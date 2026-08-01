-- Add event_type column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'wedding';

-- Create add-on services table
CREATE TABLE public.addon_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    category text NOT NULL DEFAULT 'other',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create booking_addons junction table
CREATE TABLE public.booking_addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    addon_id uuid REFERENCES public.addon_services(id) ON DELETE CASCADE NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(booking_id, addon_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
    user_id uuid NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title text,
    comment text,
    is_approved boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    phone text,
    role text NOT NULL DEFAULT 'coordinator',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create booking_staff assignment table
CREATE TABLE public.booking_staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    assigned_at timestamptz DEFAULT now(),
    notes text,
    UNIQUE(booking_id, staff_id)
);

-- Create seasonal pricing table
CREATE TABLE public.seasonal_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    price_multiplier numeric NOT NULL DEFAULT 1.0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('customer', 'admin')),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create event reminders table
CREATE TABLE public.event_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    reminder_type text NOT NULL,
    days_before integer NOT NULL,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Create customer checklists table
CREATE TABLE public.booking_checklist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    item text NOT NULL,
    is_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create wishlists table
CREATE TABLE public.wishlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    item_type text NOT NULL CHECK (item_type IN ('venue', 'menu_item', 'addon')),
    item_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS on all tables
ALTER TABLE public.addon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_services
CREATE POLICY "Anyone can view active addon services" ON public.addon_services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage addon services" ON public.addon_services FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for booking_addons
CREATE POLICY "Admins can manage booking addons" ON public.booking_addons FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert booking addons" ON public.booking_addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their booking addons" ON public.booking_addons FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_addons.booking_id AND bookings.user_id = auth.uid())
);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = reviews.booking_id AND (bookings.user_id = auth.uid() OR bookings.email = (current_setting('request.jwt.claims', true)::json->>'email')))
);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for staff
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active staff" ON public.staff FOR SELECT USING (is_active = true);

-- RLS Policies for booking_staff
CREATE POLICY "Admins can manage booking staff" ON public.booking_staff FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view staff assigned to their bookings" ON public.booking_staff FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_staff.booking_id AND bookings.user_id = auth.uid())
);

-- RLS Policies for seasonal_pricing
CREATE POLICY "Anyone can view active seasonal pricing" ON public.seasonal_pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage seasonal pricing" ON public.seasonal_pricing FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages for their bookings" ON public.chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = chat_messages.booking_id AND (bookings.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Users can send messages for their bookings" ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = chat_messages.booking_id AND (bookings.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Admins can manage all messages" ON public.chat_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for event_reminders
CREATE POLICY "Admins can manage reminders" ON public.event_reminders FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their booking reminders" ON public.event_reminders FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = event_reminders.booking_id AND bookings.user_id = auth.uid())
);

-- RLS Policies for booking_checklist
CREATE POLICY "Users can manage their booking checklist" ON public.booking_checklist FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_checklist.booking_id AND bookings.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all checklists" ON public.booking_checklist FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for wishlists
CREATE POLICY "Users can manage their wishlists" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Insert default addon services
INSERT INTO public.addon_services (name, description, price, category) VALUES
('Photography Package', 'Professional photographer for the entire event', 25000, 'photography'),
('Videography Package', 'Full HD video coverage with drone shots', 35000, 'photography'),
('DJ & Sound System', 'Professional DJ with premium sound equipment', 15000, 'entertainment'),
('Live Band', 'Live music performance', 50000, 'entertainment'),
('Flower Decoration', 'Premium floral arrangements and stage decoration', 30000, 'decoration'),
('LED Wall', 'Large LED display screen for presentations', 20000, 'decoration'),
('Bridal Makeup', 'Professional bridal makeup and styling', 15000, 'beauty'),
('Mehendi Artist', 'Professional henna artist', 10000, 'beauty'),
('Valet Parking', 'Professional valet service for guests', 8000, 'service'),
('Security Team', 'Professional security personnel', 12000, 'service');

-- Add updated_at trigger for new tables
CREATE TRIGGER update_addon_services_updated_at BEFORE UPDATE ON public.addon_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seasonal_pricing_updated_at BEFORE UPDATE ON public.seasonal_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_checklist_updated_at BEFORE UPDATE ON public.booking_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();