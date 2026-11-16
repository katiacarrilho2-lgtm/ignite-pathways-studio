import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function UploadedLessonVideo({ path, title, onTimeUpdate }: {
  path: string;
  title: string;
  onTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
}) {
  const [media, setMedia] = useState<{ path: string; url?: string; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from("course-videos").createSignedUrl(path, 60 * 60 * 4)
      .then(({ data, error }) => {
        if (active) setMedia({ path, url: data?.signedUrl, error: error ? "Não foi possível carregar o vídeo. Reabra a aula para tentar novamente." : undefined });
      });
    return () => { active = false; };
  }, [path]);
  if (media?.path === path && media.error) return <p role="alert" className="text-destructive">{media.error}</p>;
  if (media?.path !== path || !media.url) return (
    <div role="status" aria-label="Carregando vídeo" className="aspect-video rounded-lg bg-secondary grid place-items-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
  return <video aria-label={title} src={media.url} controls preload="metadata" playsInline className="w-full rounded-lg bg-secondary" onTimeUpdate={onTimeUpdate} />;
}