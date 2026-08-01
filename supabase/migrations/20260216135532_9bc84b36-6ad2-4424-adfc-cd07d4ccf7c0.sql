
-- Create digital_products table
CREATE TABLE public.digital_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  price NUMERIC NOT NULL DEFAULT 0,
  preview_image_url TEXT,
  download_url TEXT,
  is_active BOOLEAN DEFAULT true,
  event_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create digital_product_purchases table
CREATE TABLE public.digital_product_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- RLS for digital_products
CREATE POLICY "Anyone can view active digital products"
ON public.digital_products FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all digital products"
ON public.digital_products FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for digital_product_purchases
CREATE POLICY "Users can view their own purchases"
ON public.digital_product_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
ON public.digital_product_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all purchases"
ON public.digital_product_purchases FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_digital_products_updated_at
BEFORE UPDATE ON public.digital_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('digital-products', 'digital-products', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('digital-downloads', 'digital-downloads', false);

-- Storage policies for digital-products (public previews)
CREATE POLICY "Anyone can view digital product previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'digital-products');

CREATE POLICY "Admins can upload digital product previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'digital-products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update digital product previews"
ON storage.objects FOR UPDATE
USING (bucket_id = 'digital-products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete digital product previews"
ON storage.objects FOR DELETE
USING (bucket_id = 'digital-products' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for digital-downloads (private)
CREATE POLICY "Authenticated users can download purchased products"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'digital-downloads' AND
  (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.digital_product_purchases dpp
      JOIN public.digital_products dp ON dp.id = dpp.product_id
      WHERE dpp.user_id = auth.uid()
      AND dp.download_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

CREATE POLICY "Admins can upload digital downloads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'digital-downloads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update digital downloads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'digital-downloads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete digital downloads"
ON storage.objects FOR DELETE
USING (bucket_id = 'digital-downloads' AND public.has_role(auth.uid(), 'admin'));
