import { supabase } from "@/integrations/supabase/client";

export async function exportCourseJson(courseId: string) {
  const [{ data: course }, { data: sections }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase.from("course_sections").select("*").eq("course_id", courseId).order("sort_order"),
    supabase.from("course_lessons").select("*").order("sort_order"),
  ]);
  if (!course) throw new Error("Curso não encontrado");

  const lessonsBySection = new Map<string, any[]>();
  for (const l of (lessons ?? [])) {
    const arr = lessonsBySection.get((l as any).section_id) ?? [];
    arr.push(l);
    lessonsBySection.set((l as any).section_id, arr);
  }

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    course,
    sections: (sections ?? []).map((s: any) => ({
      title: s.title,
      sort_order: s.sort_order,
      ai_meta: s.ai_meta ?? {},
      lessons: (lessonsBySection.get(s.id) ?? []).map((l: any) => ({
        title: l.title,
        lesson_type: l.lesson_type,
        sort_order: l.sort_order,
        passing_score: l.passing_score,
        content: l.content,
      })),
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `curso-${(course as any).slug || courseId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}