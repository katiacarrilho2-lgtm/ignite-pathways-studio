import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, ShieldCheck, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiConfig } from "./hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ConnectApiConfig() {
  const { data: cfg } = useApiConfig();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    provider: "simulado", numero: "", phone_number_id: "",
    business_account_id: "", webhook_verify_token: "",
  });
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => { if (cfg) setForm((f: any) => ({ ...f, ...cfg })); }, [cfg]);

  const save = async () => {
    const payload: any = {
      provider: form.provider,
      numero: form.numero, phone_number_id: form.phone_number_id,
      business_account_id: form.business_account_id, webhook_verify_token: form.webhook_verify_token,
      token_set: cfg?.token_set || !!tokenInput,
    };
    const { error } = await (supabase as any).from("connect_api_config").update(payload).eq("id", cfg?.id);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Configurações salvas");
    if (tokenInput) toast.info("Token recebido. Adicione-o como secret WHATSAPP_CLOUD_TOKEN para envio real.");
    qc.invalidateQueries({ queryKey: ["connect", "apiconfig"] });
  };

  const testConnection = async () => {
    const ok = form.provider === "simulado" ? true : !!(form.phone_number_id && cfg?.token_set);
    const status = ok ? "conectado" : "desconectado";
    await (supabase as any).from("connect_api_config").update({ status }).eq("id", cfg?.id);
    qc.invalidateQueries({ queryKey: ["connect", "apiconfig"] });
    if (ok && form.provider === "simulado") toast.success("Modo simulado ativo — mensagens marcadas como enviadas sem chamar a Meta");
    else if (ok) toast.success("Conexão validada");
    else toast.warning("Preencha Phone Number ID e cadastre o token");
  };

  const connected = cfg?.status === "conectado";
  const isCloud = form.provider === "whatsapp_cloud";
  const isSim = form.provider === "simulado";

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Provedor de envio</CardTitle>
          <Badge variant="secondary" className={connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
            {connected ? <Wifi className="size-3.5 mr-1" /> : <WifiOff className="size-3.5 mr-1" />}
            {cfg?.status || "desconectado"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Como enviar as mensagens?</Label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simulado">Modo simulado (não envia de verdade)</SelectItem>
                <SelectItem value="whatsapp_cloud">WhatsApp Cloud API (Meta oficial)</SelectItem>
                <SelectItem value="evolution" disabled>Evolution API (em breve)</SelectItem>
              </SelectContent>
            </Select>
            {isSim && (
              <p className="text-xs text-muted-foreground mt-2 flex gap-1.5">
                <Info className="size-3.5 mt-0.5 shrink-0 text-amber-600" />
                As mensagens aparecem como “simulada” no histórico — útil para testar o fluxo sem gastar quota.
              </p>
            )}
          </div>
          {isCloud && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Número conectado</Label><Input placeholder="+55 11 99999-9999" value={form.numero || ""} onChange={e => setForm({ ...form, numero: e.target.value })} /></div>
                <div><Label>Phone Number ID</Label><Input placeholder="ID do número (Meta)" value={form.phone_number_id || ""} onChange={e => setForm({ ...form, phone_number_id: e.target.value })} /></div>
                <div><Label>WhatsApp Business Account ID</Label><Input value={form.business_account_id || ""} onChange={e => setForm({ ...form, business_account_id: e.target.value })} /></div>
                <div><Label>Webhook Verify Token</Label><Input placeholder="invente um, ex: mptk_meta_2026" value={form.webhook_verify_token || ""} onChange={e => setForm({ ...form, webhook_verify_token: e.target.value })} /></div>
              </div>
              <div>
                <Label>Token permanente (Meta)</Label>
                <Input type="password" placeholder={cfg?.token_set ? "•••••••• (cadastrado como secret)" : "Cole o token aqui"} value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Vai ser pedido como secret <code>WHATSAPP_CLOUD_TOKEN</code> em uma próxima etapa.
                  O webhook da Meta deve apontar para: <code className="break-all">https://tovmaxtxijzhkcgrleom.supabase.co/functions/v1/whatsapp-webhook</code>
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={save}>Salvar configuração</Button>
            <Button variant="outline" onClick={testConnection}>Testar conexão</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}