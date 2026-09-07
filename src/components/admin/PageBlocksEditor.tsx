import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, Upload } from "lucide-react";
import {
  ADDABLE_BLOCK_KINDS, BLOCK_KIND_LABELS, BlockKind, ICON_OPTIONS,
  PageBlock, PageSettings, emptyBlock, newBlockId,
} from "@/lib/siteSettings";

type Props = {
  value: PageSettings;
  onChange: (v: PageSettings) => void;
  onUpload: (file: File, apply: (url: string) => void) => void;
};

const HAS_ITEMS: BlockKind[] = ["cards", "list", "steps", "quotes", "logos", "gallery", "contacts"];
const HAS_IMAGE: BlockKind[] = ["image_text", "list", "steps"];
const HAS_CTA: BlockKind[] = ["image_text", "gallery", "cta"];
const HAS_BODY: BlockKind[] = ["image_text", "text"];

export const PageBlocksEditor = ({ value, onChange, onUpload }: Props) => {
  const setBlocks = (blocks: PageBlock[]) => onChange({ ...value, blocks });
  const patchBlock = (idx: number, patch: Partial<PageBlock>) => {
    const arr = [...value.blocks];
    arr[idx] = { ...arr[idx], ...patch };
    setBlocks(arr);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...value.blocks];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setBlocks(arr);
  };
  const remove = (idx: number) => setBlocks(value.blocks.filter((_, i) => i !== idx));
  const duplicate = (idx: number) =>
    setBlocks([
      ...value.blocks.slice(0, idx + 1),
      { ...value.blocks[idx], id: newBlockId(), title: `${value.blocks[idx].title ?? ""} (cópia)` },
      ...value.blocks.slice(idx + 1),
    ]);
  const add = (kind: BlockKind) => setBlocks([...value.blocks, emptyBlock(kind)]);

  const patchItem = (bi: number, ii: number, patch: Record<string, string>) => {
    const items = [...value.blocks[bi].items];
    items[ii] = { ...items[ii], ...patch };
    patchBlock(bi, { items });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Topo da página</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Chapéu (texto pequeno)</Label>
            <Input value={value.hero_eyebrow} onChange={(e) => onChange({ ...value, hero_eyebrow: e.target.value })} /></div>
          <div><Label>Título</Label>
            <Input value={value.hero_title} onChange={(e) => onChange({ ...value, hero_title: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label>
            <Textarea rows={2} value={value.hero_description} onChange={(e) => onChange({ ...value, hero_description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle>Blocos da página</CardTitle>
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => add(v as BlockKind)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Adicionar bloco…" /></SelectTrigger>
              <SelectContent>
                {ADDABLE_BLOCK_KINDS.map((k) => <SelectItem key={k} value={k}>{BLOCK_KIND_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Plus className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {!value.blocks.length && <p className="text-muted-foreground text-sm py-6 text-center">Nenhum bloco ainda. Use “Adicionar bloco”.</p>}
          <Accordion type="multiple" className="space-y-3">
            {value.blocks.map((b, bi) => (
              <AccordionItem key={b.id} value={b.id} className="border border-border rounded-lg px-4">
                <div className="flex items-center gap-2 py-1">
                  <AccordionTrigger className="flex-1 hover:no-underline">
                    <div className="text-left">
                      <div className="font-semibold text-primary">
                        {b.kind === "slot" ? b.slot_label || "Formulário" : b.title || BLOCK_KIND_LABELS[b.kind]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {BLOCK_KIND_LABELS[b.kind]}{b.visible === false ? " · oculto no site" : ""}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-1">
                    <Switch checked={b.visible !== false} onCheckedChange={(v) => patchBlock(bi, { visible: v })} />
                    <Button variant="ghost" size="icon" onClick={() => move(bi, -1)} title="Subir"><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => move(bi, 1)} title="Descer"><ArrowDown className="size-4" /></Button>
                    {b.kind !== "slot" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => duplicate(bi)} title="Duplicar"><Copy className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(bi)} title="Excluir"><Trash2 className="size-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </div>

                <AccordionContent className="pb-5 space-y-4">
                  {b.kind === "slot" ? (
                    <p className="text-sm text-muted-foreground">
                      Este bloco é o formulário do site. Você pode ocultá-lo ou mudá-lo de posição, mas os campos do formulário não são editáveis aqui.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><Label>Chapéu</Label><Input value={b.eyebrow ?? ""} onChange={(e) => patchBlock(bi, { eyebrow: e.target.value })} /></div>
                        <div><Label>Título</Label><Input value={b.title ?? ""} onChange={(e) => patchBlock(bi, { title: e.target.value })} /></div>
                        <div className="md:col-span-2"><Label>Subtítulo</Label>
                          <Textarea rows={2} value={b.subtitle ?? ""} onChange={(e) => patchBlock(bi, { subtitle: e.target.value })} /></div>
                      </div>

                      {HAS_BODY.includes(b.kind) && (
                        <div>
                          <Label>Texto</Label>
                          <Textarea rows={6} value={b.body ?? ""} onChange={(e) => patchBlock(bi, { body: e.target.value })} />
                          <p className="text-xs text-muted-foreground mt-1">Deixe uma linha em branco para separar parágrafos.</p>
                        </div>
                      )}

                      {b.kind === "map" && (
                        <div><Label>Endereço do mapa (link de incorporação)</Label>
                          <Input value={b.body ?? ""} onChange={(e) => patchBlock(bi, { body: e.target.value })} /></div>
                      )}

                      <div className="flex flex-wrap gap-4 items-center">
                        <label className="flex items-center gap-2 text-sm"><Switch checked={!!b.center} onCheckedChange={(v) => patchBlock(bi, { center: v })} /> Título centralizado</label>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={b.bg === "muted"} onCheckedChange={(v) => patchBlock(bi, { bg: v ? "muted" : "none" })} /> Fundo cinza</label>
                        {HAS_IMAGE.includes(b.kind) && (
                          <label className="flex items-center gap-2 text-sm"><Switch checked={!!b.image_right} onCheckedChange={(v) => patchBlock(bi, { image_right: v })} /> Imagem à direita</label>
                        )}
                      </div>

                      {HAS_IMAGE.includes(b.kind) && (
                        <div className="grid gap-3 md:grid-cols-2 items-start">
                          <div className="rounded-lg border border-border bg-secondary/40 overflow-hidden aspect-[16/9] grid place-items-center">
                            {b.image_url
                              ? <img src={b.image_url} alt="Imagem do bloco" className="w-full h-full object-cover" />
                              : <span className="text-sm text-muted-foreground px-4 text-center">Usando a imagem padrão desta página</span>}
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                              <Upload className="size-4" /> Enviar imagem
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], (url) => patchBlock(bi, { image_url: url }))} />
                            </label>
                            <div><Label>Ou endereço da imagem</Label>
                              <Input value={b.image_url ?? ""} onChange={(e) => patchBlock(bi, { image_url: e.target.value })} placeholder="https://…" /></div>
                            {b.image_url && <Button variant="ghost" size="sm" onClick={() => patchBlock(bi, { image_url: "" })}>Remover imagem</Button>}
                          </div>
                        </div>
                      )}

                      {HAS_CTA.includes(b.kind) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><Label>Botão — texto</Label><Input value={b.cta_label ?? ""} onChange={(e) => patchBlock(bi, { cta_label: e.target.value })} placeholder="Deixe vazio para não exibir" /></div>
                          <div><Label>Botão — destino</Label><Input value={b.cta_href ?? ""} onChange={(e) => patchBlock(bi, { cta_href: e.target.value })} placeholder="/contato" /></div>
                        </div>
                      )}

                      {HAS_ITEMS.includes(b.kind) && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Itens do bloco</Label>
                            <Button variant="outline" size="sm" onClick={() => patchBlock(bi, { items: [...b.items, { icon: "Sparkles", title: "Novo item", text: "" }] })}>
                              <Plus className="size-4" /> Adicionar item
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {b.items.map((it, ii) => (
                              <div key={ii} className="rounded-lg border border-border p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Item {ii + 1}</span>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" title="Subir" onClick={() => {
                                      if (ii === 0) return;
                                      const items = [...b.items]; [items[ii - 1], items[ii]] = [items[ii], items[ii - 1]]; patchBlock(bi, { items });
                                    }}><ArrowUp className="size-3.5" /></Button>
                                    <Button variant="ghost" size="icon" title="Descer" onClick={() => {
                                      if (ii === b.items.length - 1) return;
                                      const items = [...b.items]; [items[ii + 1], items[ii]] = [items[ii], items[ii + 1]]; patchBlock(bi, { items });
                                    }}><ArrowDown className="size-3.5" /></Button>
                                    <Button variant="ghost" size="icon" title="Excluir"
                                      onClick={() => patchBlock(bi, { items: b.items.filter((_, k) => k !== ii) })}>
                                      <Trash2 className="size-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </div>

                                {b.kind !== "gallery" && (
                                  <div className="grid grid-cols-3 gap-2">
                                    {b.kind !== "quotes" && (
                                      <div>
                                        <Label>Ícone</Label>
                                        <Select value={it.icon || "Sparkles"} onValueChange={(v) => patchItem(bi, ii, { icon: v })}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>{ICON_OPTIONS.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    <div className={b.kind === "quotes" ? "col-span-3" : "col-span-2"}>
                                      <Label>{b.kind === "quotes" ? "Nome de quem falou" : "Título"}</Label>
                                      <Input value={it.title ?? ""} onChange={(e) => patchItem(bi, ii, { title: e.target.value })} />
                                    </div>
                                  </div>
                                )}

                                {b.kind !== "logos" && b.kind !== "gallery" && (
                                  <div><Label>Texto</Label>
                                    <Textarea rows={3} value={it.text ?? ""} onChange={(e) => patchItem(bi, ii, { text: e.target.value })} /></div>
                                )}

                                {b.kind === "contacts" && (
                                  <div><Label>Link ao clicar</Label>
                                    <Input value={it.href ?? ""} onChange={(e) => patchItem(bi, ii, { href: e.target.value })} placeholder="https://wa.me/…" /></div>
                                )}

                                {(b.kind === "gallery" || b.kind === "logos") && (
                                  <div className="space-y-2">
                                    {b.kind === "gallery" && (
                                      <div><Label>Legenda</Label>
                                        <Input value={it.title ?? ""} onChange={(e) => patchItem(bi, ii, { title: e.target.value })} /></div>
                                    )}
                                    {it.image_url && <img src={it.image_url} alt="" className="rounded-md max-h-28 object-cover w-full" />}
                                    <label className="flex items-center gap-2 border border-dashed rounded-lg p-2 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                                      <Upload className="size-4" /> Enviar imagem
                                      <input type="file" accept="image/*" className="hidden"
                                        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], (url) => patchItem(bi, ii, { image_url: url }))} />
                                    </label>
                                    <Input value={it.image_url ?? ""} onChange={(e) => patchItem(bi, ii, { image_url: e.target.value })} placeholder="https://…" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
