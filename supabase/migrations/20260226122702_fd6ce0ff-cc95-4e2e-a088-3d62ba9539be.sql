
-- User cookbook: personal recipes (both created and saved/customized from explorer)
CREATE TABLE public.user_cookbook (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  servings INTEGER,
  prep_time INTEGER,
  cook_time INTEGER,
  steps TEXT[] DEFAULT '{}'::TEXT[],
  image_url TEXT,
  source_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cookbook ingredients
CREATE TABLE public.user_cookbook_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cookbook_recipe_id UUID NOT NULL REFERENCES public.user_cookbook(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  is_optional BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cookbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cookbook_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS for user_cookbook
CREATE POLICY "Users can view their own cookbook" ON public.user_cookbook FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create cookbook recipes" ON public.user_cookbook FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cookbook recipes" ON public.user_cookbook FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cookbook recipes" ON public.user_cookbook FOR DELETE USING (auth.uid() = user_id);

-- RLS for ingredients (via cookbook ownership)
CREATE POLICY "Users can view their cookbook ingredients" ON public.user_cookbook_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_cookbook WHERE id = cookbook_recipe_id AND user_id = auth.uid()));
CREATE POLICY "Users can add cookbook ingredients" ON public.user_cookbook_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_cookbook WHERE id = cookbook_recipe_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their cookbook ingredients" ON public.user_cookbook_ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_cookbook WHERE id = cookbook_recipe_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their cookbook ingredients" ON public.user_cookbook_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_cookbook WHERE id = cookbook_recipe_id AND user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_user_cookbook_updated_at
  BEFORE UPDATE ON public.user_cookbook
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_user_cookbook_user_id ON public.user_cookbook(user_id);
CREATE INDEX idx_user_cookbook_ingredients_recipe ON public.user_cookbook_ingredients(cookbook_recipe_id);
