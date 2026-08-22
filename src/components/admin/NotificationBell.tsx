import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";

const icone = (tipo: string) =>
  ({ mensagem: "🔥", tarefa: "✅", solicitacao: "📋", estoque: "📦", financeiro: "💰", pedagogico: "🎓" } as Record<string, string>)[tipo] ?? "🔔";

export const NotificationBell = () => {
  const { items, unread, markRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
              <CheckCheck className="size-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação.</p>}
          {items.map(n => (
            <Link
              key={n.id}
              to={n.link ?? "#"}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`flex gap-2 px-3 py-2.5 border-b border-border/60 hover:bg-secondary transition-smooth ${n.read_at ? "opacity-60" : ""}`}
            >
              <span className="text-base leading-5">{icone(n.tipo)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{n.titulo}</span>
                {n.corpo && <span className="block text-xs text-muted-foreground line-clamp-2">{n.corpo}</span>}
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </span>
              </span>
              {!n.read_at && <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            </Link>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
