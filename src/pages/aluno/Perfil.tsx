import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Perfil = () => {
  const { user } = useAuth();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); setCpf(data.cpf ?? ""); }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("student_profiles")
      .upsert({ user_id: user.id, full_name, phone, cpf }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
  };

  return (
    <div className="p-8 max-w-xl space-y-6">
      <div><h1 className="text-3xl font-bold text-primary">Meu Perfil</h1><p className="text-muted-foreground">Atualize seus dados pessoais</p></div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div><Label>E-mail</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Nome completo</Label><Input value={full_name} onChange={e=>setFullName(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
        <div><Label>CPF</Label><Input value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="000.000.000-00" /></div>
        <Button onClick={save} variant="hero" disabled={saving}>{saving?"Salvando...":"Salvar"}</Button>
      </div>
    </div>
  );
};
export default Perfil;