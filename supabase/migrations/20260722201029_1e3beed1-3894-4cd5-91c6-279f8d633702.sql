
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'certificadora';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage_affiliates';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_commission';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'issue_boletos';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'settle_boletos';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage_certification';
