import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AcInstallSimulator } from "./AcInstallSimulator";
import { useGamification } from "@/lib/gamer/useGamification";
import { fireConfetti, sfx } from "@/lib/gamer/sfx";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  courseSlug?: string;
  courseTitle: string;
};

type Phase = "intro" | "simulator" | "review" | "done";

const SIMULATOR_COURSE_SLUGS = new Set(["instalacao-ar-split-preparatorio"]);

export function CourseFinale({ open, onOpenChange, courseId, courseSlug, courseTitle }: Props) {
  const { user } = useAuth();
  const { award } = useGamification();
  const hasSimulator = courseSlug ? SIMULATOR_COURSE_SLUGS.has(courseSlug) : false;
  const [phase, setPhase] = useState<Phase>("intro");
  const [simScore, setSimScore] = useState<number | null>(null);
  const [ratingPlatform, setRatingPlatform] = useState(0);
  const [ratingCourse, setRatingCourse] = useState(0);
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [allowPublic, setAllowPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || ratingPlatform === 0) { toast.error("Dá pelo menos 1 estrela pra plataforma 😊"); return; }
    setSaving(true);
    const { error } = await supabase.from("platform_reviews").insert({
      user_id: user.id,
      course_id: courseId,
      rating_platform: ratingPlatform,
      rating_course: ratingCourse || null,
      liked: liked || null,
      improve: improve || null,
      allow_public: allowPublic,
      simulator_score: simScore,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await award(200, 50, { label: "+200 XP · REVIEW" });
    fireConfetti(2500);
    sfx.complete();
    setPhase("done");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gamer-shell">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="size-5 text-[hsl(var(--neon-yellow))]" />
            {phase === "done" ? "Missão cumprida!" : "Você chegou ao fim!"}
          </DialogTitle>
        </DialogHeader>

        {phase === "intro" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Parabéns por concluir <b className="text-foreground">{courseTitle}</b>! Vamos fechar com chave de ouro:
            </p>
            <ol className="space-y-2 text-sm">
              {hasSimulator && <li className="flex items-start gap-2"><Sparkles className="size-4 text-[hsl(var(--neon-purple))] mt-0.5" /> Simulador: instale um split passo a passo e ganhe XP.</li>}
              <li className="flex items-start gap-2"><Star className="size-4 text-[hsl(var(--neon-yellow))] mt-0.5" /> Avalie a plataforma e este curso (2 min).</li>
              <li className="flex items-start gap-2"><Trophy className="size-4 text-[hsl(var(--neon-green))] mt-0.5" /> Libere seu certificado.</li>
            </ol>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Depois</Button>
              <Button onClick={() => setPhase(hasSimulator ? "simulator" : "review")}>
                {hasSimulator ? "Começar simulador" : "Ir para avaliação"}
              </Button>
            </div>
          </div>
        )}

        {phase === "simulator" && (
          <AcInstallSimulator onFinish={async (score, max) => {
            setSimScore(score);
            await award(Math.round(score / 5), Math.round(score / 20), { label: `+${Math.round(score/5)} XP` });
            setPhase("review");
          }} />
        )}

        {phase === "review" && (
          <div className="space-y-4">
            {simScore !== null && (
              <div className="rounded-xl border border-[hsl(var(--neon-green)/0.4)] bg-[hsl(var(--neon-green)/0.08)] p-3 text-sm">
                <b>Score do simulador:</b> {simScore} pontos 🏆
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Como você avalia a plataforma?</label>
              <StarPicker value={ratingPlatform} onChange={setRatingPlatform} />
            </div>
            <div>
              <label className="text-sm font-medium">E este curso?</label>
              <StarPicker value={ratingCourse} onChange={setRatingCourse} />
            </div>
            <div>
              <label className="text-sm font-medium">O que você mais gostou?</label>
              <Textarea value={liked} onChange={e => setLiked(e.target.value)} placeholder="Ex.: os exercícios interativos, a linguagem clara..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">O que podemos melhorar?</label>
              <Textarea value={improve} onChange={e => setImprove(e.target.value)} placeholder="Ex.: mais vídeos, mais exemplos práticos..." rows={2} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={allowPublic} onCheckedChange={(v) => setAllowPublic(!!v)} />
              <span>Autorizo usar meu depoimento no site da Multplick.</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
              <Button onClick={submit} disabled={saving}>Enviar avaliação (+200 XP)</Button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="py-8 text-center space-y-3">
            <div className="text-6xl">🏆</div>
            <h3 className="text-2xl font-bold">Valeu demais!</h3>
            <p className="text-muted-foreground">Sua opinião ajuda outros alunos e a Multplick a melhorar sempre.</p>
            <Button onClick={() => onOpenChange(false)}>Continuar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => { onChange(n); sfx.click(); }}
          className="p-1 hover:scale-110 transition"
          aria-label={`${n} estrelas`}
        >
          <Star className={`size-8 ${n <= value ? "fill-[hsl(var(--neon-yellow))] text-[hsl(var(--neon-yellow))]" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}