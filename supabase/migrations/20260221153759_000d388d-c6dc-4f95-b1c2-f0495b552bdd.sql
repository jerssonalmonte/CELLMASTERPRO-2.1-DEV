
-- Add logo_url column to tenants
ALTER TABLE public.tenants ADD COLUMN logo_url text DEFAULT NULL;

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);

-- RLS policies for org-logos bucket
CREATE POLICY "Org logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

CREATE POLICY "Super admins can upload org logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'org-logos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update org logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'org-logos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete org logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'org-logos' AND public.is_super_admin(auth.uid()));
