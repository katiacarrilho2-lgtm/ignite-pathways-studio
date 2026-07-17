import { useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { useContacts, useStages, useMoveContact, formatPhone } from "./hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

function Column({ stage, contacts }: { stage: any; contacts: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });
  return (
    <div className="w-72 flex-shrink-0">
      <div className="rounded-t-lg px-3 py-2 flex items-center justify-between text-white font-semibold text-sm" style={{ background: stage.cor }}>
        <span>{stage.nome}</span>
        <span className="bg-white/20 rounded-full px-2 text-xs">{contacts.length}</span>
      </div>
      <div ref={setNodeRef} className={`min-h-[60vh] rounded-b-lg bg-secondary/40 p-2 space-y-2 transition-colors ${isOver ? "bg-primary/10" : ""}`}>
        {contacts.map(c => <CardItem key={c.id} contact={c} />)}
        {contacts.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Arraste cards para cá</p>}
      </div>
    </div>
  );
}

function CardItem({ contact }: { contact: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <Card ref={setNodeRef} {...listeners} {...attributes} style={style}
      className={`p-3 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}>
      <div className="font-medium text-sm text-foreground">{contact.nome}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="size-3" />{formatPhone(contact.whatsapp)}</div>
      {(contact.cidade || contact.estado) && (
        <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" />{[contact.cidade, contact.estado].filter(Boolean).join("/")}</div>
      )}
      {contact.origem && <Badge variant="secondary" className="mt-2 text-[10px]">{contact.origem}</Badge>}
    </Card>
  );
}

export default function ConnectKanban() {
  const { data: stages = [] } = useStages();
  const { data: contacts = [] } = useContacts();
  const move = useMoveContact();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage = useMemo(() => {
    const map = new Map<string, any[]>();
    stages.forEach(s => map.set(s.id, []));
    const orphans: any[] = [];
    contacts.forEach((c: any) => {
      if (c.stage_id && map.has(c.stage_id)) map.get(c.stage_id)!.push(c);
      else orphans.push(c);
    });
    return { map, orphans };
  }, [stages, contacts]);

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id?.toString();
    if (!overId?.startsWith("stage-")) return;
    const stageId = overId.replace("stage-", "");
    move.mutate({ id: e.active.id.toString(), stage_id: stageId, stage_ordem: 0 }, { onSuccess: () => toast.success("Lead movido") });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(s => <Column key={s.id} stage={s} contacts={byStage.map.get(s.id) || []} />)}
        {byStage.orphans.length > 0 && (
          <div className="w-72 flex-shrink-0">
            <div className="rounded-t-lg px-3 py-2 bg-muted text-foreground font-semibold text-sm flex items-center justify-between">
              Sem etapa <span className="bg-foreground/10 rounded-full px-2 text-xs">{byStage.orphans.length}</span>
            </div>
            <div className="min-h-[60vh] rounded-b-lg bg-secondary/40 p-2 space-y-2">
              {byStage.orphans.map((c: any) => <CardItem key={c.id} contact={c} />)}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}