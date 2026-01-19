-- Create table for user favorite recipes
CREATE TABLE public.user_favorite_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.user_favorite_recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies for favorites
CREATE POLICY "Users can view their own favorites"
ON public.user_favorite_recipes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
ON public.user_favorite_recipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
ON public.user_favorite_recipes FOR DELETE
USING (auth.uid() = user_id);

-- Create table for recipe purchase history (linked to completed shopping lists)
CREATE TABLE public.user_recipe_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  servings INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_recipe_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for history
CREATE POLICY "Users can view their own recipe history"
ON public.user_recipe_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own recipe history"
ON public.user_recipe_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_user_favorite_recipes_user_id ON public.user_favorite_recipes(user_id);
CREATE INDEX idx_user_recipe_history_user_id ON public.user_recipe_history(user_id);
CREATE INDEX idx_user_recipe_history_completed_at ON public.user_recipe_history(completed_at DESC);