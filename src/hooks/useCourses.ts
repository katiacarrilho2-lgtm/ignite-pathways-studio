import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DbCourse = {
  id: string;
  slug: string;
  title: string;
  category: string;
  duration: string | null;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  featured: boolean;
  sort_order: number;
  price_cents: number | null;
};

export const useCourses = (opts?: { featuredOnly?: boolean; limit?: number }) => {
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase.from("courses").select("*").eq("active", true).order("sort_order");
      if (opts?.featuredOnly) q = q.eq("featured", true);
      if (opts?.limit) q = q.limit(opts.limit);
      const { data } = await q;
      if (!cancelled) { setCourses((data ?? []) as DbCourse[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [opts?.featuredOnly, opts?.limit]);

  return { courses, loading };
};

export const useCategories = () => {
  const { courses } = useCourses();
  return Array.from(new Set(courses.map(c => c.category)));
};
