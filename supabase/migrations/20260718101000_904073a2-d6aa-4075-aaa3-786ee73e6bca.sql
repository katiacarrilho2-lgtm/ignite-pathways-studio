
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_enrollments_seller ON public.enrollments(seller_id);
