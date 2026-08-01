-- Restrict download_url exposure from anonymous visitors (column-level grants)
REVOKE SELECT ON public.digital_products FROM anon;
GRANT SELECT (id, name, description, category, price, preview_image_url, is_active, event_type, created_at, updated_at) ON public.digital_products TO anon;

-- Lock down SECURITY DEFINER helper functions that don't need to be callable from the API
REVOKE EXECUTE ON FUNCTION public.handle_new_admin_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_staff() FROM PUBLIC, anon, authenticated;

-- Remove broad public SELECT on storage.objects that allowed listing the digital-products bucket.
-- The bucket remains publicly readable via its CDN URLs (used for preview images).
DROP POLICY IF EXISTS "Anyone can view digital product previews" ON storage.objects;