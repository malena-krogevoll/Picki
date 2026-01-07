-- Create recipes table for storing all recipes (dinners and base products)
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  servings INT,
  prep_time INT,
  cook_time INT,
  category TEXT NOT NULL,
  recipe_type TEXT NOT NULL DEFAULT 'dinner' CHECK (recipe_type IN ('dinner', 'base', 'diy')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  allergens TEXT[] DEFAULT '{}',
  diet_tags TEXT[] DEFAULT '{}',
  steps TEXT[] DEFAULT '{}',
  image_url TEXT,
  replaces TEXT, -- For DIY recipes: what commercial product this replaces
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  allergens TEXT[] DEFAULT '{}',
  is_optional BOOLEAN DEFAULT false,
  base_product_id UUID REFERENCES public.recipes(id), -- Link to base product if this can be made from scratch
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_recipe_substitutions for storing user-specific substitutions
CREATE TABLE public.user_recipe_substitutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  substitutions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Enable RLS on all tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipe_substitutions ENABLE ROW LEVEL SECURITY;

-- Recipes: Everyone can read published recipes
CREATE POLICY "Anyone can view published recipes"
ON public.recipes
FOR SELECT
USING (status = 'published');

-- Recipe ingredients: Everyone can read ingredients for published recipes
CREATE POLICY "Anyone can view ingredients for published recipes"
ON public.recipe_ingredients
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.recipes 
  WHERE recipes.id = recipe_ingredients.recipe_id 
  AND recipes.status = 'published'
));

-- User substitutions: Users can only manage their own substitutions
CREATE POLICY "Users can view their own substitutions"
ON public.user_recipe_substitutions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own substitutions"
ON public.user_recipe_substitutions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own substitutions"
ON public.user_recipe_substitutions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own substitutions"
ON public.user_recipe_substitutions
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_recipes_type ON public.recipes(recipe_type);
CREATE INDEX idx_recipes_status ON public.recipes(status);
CREATE INDEX idx_recipes_category ON public.recipes(category);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_user_substitutions_user_recipe ON public.user_recipe_substitutions(user_id, recipe_id);

-- Create trigger for updated_at on recipes
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_recipe_substitutions
CREATE TRIGGER update_user_recipe_substitutions_updated_at
BEFORE UPDATE ON public.user_recipe_substitutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();