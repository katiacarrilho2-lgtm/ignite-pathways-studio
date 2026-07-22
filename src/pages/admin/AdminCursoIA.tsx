import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { RequirePermission } from "@/components/admin/AdminLayout";

const Inner = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "tecnicos", workload: "40h", level: "Iniciante",
    audience: "", num_modules: 4, lessons_per_module: 5, depth: "Intermediário",
    tone: "Didático", extra_prompt: "", include_materials: true, include_image_prompts: true,
  });

  const generate = async () => {
    if (!form.title.trim()) return toast.error("Informe o título do curso");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-ai", {
        body: { action: "full_course", payload: form },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Curso gerado! Redirecionando…");
      const courseId = (data as any)?.course_id;
      if (courseId) nav(`/admin/cursos/${courseId}/builder`);
    } catch (e: any) { toast.error(e.message ?? "Falha ao gerar"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Sparkles className="size-3.5" /> Gerador de cursos por IA
        </div>
        <h1 className="text-3xl font-bold text-primary mt-2">Criar curso completo com IA</h1>
        <p className="text-muted-foreground">Descreva o tema — a IA monta módulos, aulas, materiais e (opcionalmente) imagens de capa.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Parâmetros do curso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Título do curso *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Instalação de Ar-Condicionado Split" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Carga horária</Label><Input value={form.workload} onChange={(e) => setForm({ ...form, workload: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Nível</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Módulos</Label><Input type="number" min={1} max={12} value={form.num_modules} onChange={(e) => setForm({ ...form, num_modules: Number(e.target.value) })} /></div>
            <div><Label>Aulas / módulo</Label><Input type="number" min={1} max={15} value={form.lessons_per_module} onChange={(e) => setForm({ ...form, lessons_per_module: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Profundidade</Label>
              <Select value={form.depth} onValueChange={(v) => setForm({ ...form, depth: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Aprofundado">Aprofundado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tom</Label><Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} /></div>
          </div>
          <div><Label>Público-alvo</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Ex: Técnicos em refrigeração, jovens em qualificação" /></div>
          <div><Label>Instruções adicionais</Label><Textarea rows={4} value={form.extra_prompt} onChange={(e) => setForm({ ...form, extra_prompt: e.target.value })} placeholder="Aspectos que a IA deve enfatizar, normas específicas, exemplos regionais…" /></div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.include_materials} onChange={(e) => setForm({ ...form, include_materials: e.target.checked })} /> Gerar materiais complementares</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.include_image_prompts} onChange={(e) => setForm({ ...form, include_image_prompts: e.target.checked })} /> Gerar prompts de imagem por módulo</label>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3 text-xs">A geração pode levar de 1 a 3 minutos e consome créditos de IA do workspace. As aulas ficam em fila e você poderá editar tudo depois no builder.</div>
          <Button variant="hero" className="w-full" disabled={loading} onClick={generate}>
            {loading ? <><Loader2 className="size-4 animate-spin" /> Gerando…</> : <><Sparkles className="size-4" /> Gerar curso com IA</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default function AdminCursoIA() {
  return <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
}
