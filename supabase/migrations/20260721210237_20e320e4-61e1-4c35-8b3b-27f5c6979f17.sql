
CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  coins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_gamification TO authenticated;
GRANT ALL ON public.user_gamification TO service_role;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gamification" ON public.user_gamification FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.platform_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  rating_platform SMALLINT NOT NULL CHECK (rating_platform BETWEEN 1 AND 5),
  rating_course SMALLINT CHECK (rating_course BETWEEN 1 AND 5),
  liked TEXT,
  improve TEXT,
  comment TEXT,
  allow_public BOOLEAN NOT NULL DEFAULT false,
  simulator_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.platform_reviews TO authenticated;
GRANT SELECT ON public.platform_reviews TO anon;
GRANT ALL ON public.platform_reviews TO service_role;
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own review" ON public.platform_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read own review" ON public.platform_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id OR allow_public = true);
CREATE POLICY "read public reviews" ON public.platform_reviews FOR SELECT TO anon USING (allow_public = true);

CREATE TABLE IF NOT EXISTS public.lesson_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  mood TEXT CHECK (mood IN ('confused','ok','loved')),
  self_rating SMALLINT CHECK (self_rating BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE ON public.lesson_reflections TO authenticated;
GRANT ALL ON public.lesson_reflections TO service_role;
ALTER TABLE public.lesson_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections" ON public.lesson_reflections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_xp(delta_xp INT, delta_coins INT DEFAULT 0)
RETURNS public.user_gamification
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  row public.user_gamification;
  today DATE := (now() AT TIME ZONE 'UTC')::date;
  last_date DATE;
  new_streak INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_gamification (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO row FROM public.user_gamification WHERE user_id = uid FOR UPDATE;
  last_date := (row.last_activity_at AT TIME ZONE 'UTC')::date;
  IF last_date IS NULL OR last_date < today - INTERVAL '1 day' THEN
    new_streak := 1;
  ELSIF last_date = today - INTERVAL '1 day' THEN
    new_streak := row.current_streak + 1;
  ELSE
    new_streak := row.current_streak;
  END IF;
  UPDATE public.user_gamification SET
    xp = row.xp + GREATEST(delta_xp, 0),
    coins = row.coins + GREATEST(delta_coins, 0),
    level = GREATEST(1, 1 + ((row.xp + GREATEST(delta_xp, 0)) / 500)),
    current_streak = new_streak,
    longest_streak = GREATEST(row.longest_streak, new_streak),
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO row;
  RETURN row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.add_xp(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp(INT, INT) TO authenticated;
