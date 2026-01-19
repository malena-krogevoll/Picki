-- Create enum for product data sources
CREATE TYPE public.product_source_type AS ENUM ('EPD', 'KASSALAPP', 'MANUAL');

-- A) products (master / best available product data)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text UNIQUE NOT NULL,
  name text,
  brand text,
  image_url text,
  ingredients_raw text,
  nova_class integer CHECK (nova_class >= 1 AND nova_class <= 4),
  nova_confidence numeric CHECK (nova_confidence >= 0 AND nova_confidence <= 1),
  nova_reason text,
  ingredients_hash text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index on EAN for fast lookups
CREATE INDEX idx_products_ean ON public.products(ean);

-- B) product_sources (raw data per source)
CREATE TABLE public.product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text NOT NULL,
  source product_source_type NOT NULL,
  source_product_id text,
  payload jsonb NOT NULL,
  name text,
  brand text,
  image_url text,
  ingredients_raw text,
  fetched_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(ean, source)
);

-- Index on EAN for fast lookups
CREATE INDEX idx_product_sources_ean ON public.product_sources(ean);

-- C) chains (store chains)
CREATE TABLE public.chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- D) offers (chain availability observations)
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text NOT NULL,
  chain_id uuid NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  source text DEFAULT 'KASSALAPP',
  UNIQUE(ean, chain_id)
);

-- Index on EAN for fast lookups
CREATE INDEX idx_offers_ean ON public.offers(ean);

-- Trigger to update products.updated_at on any change
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products: anyone can read, only service role can write
CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update products"
  ON public.products FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete products"
  ON public.products FOR DELETE
  USING (auth.role() = 'service_role');

-- RLS Policies for product_sources: only service role can access
CREATE POLICY "Service role can read product_sources"
  ON public.product_sources FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert product_sources"
  ON public.product_sources FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update product_sources"
  ON public.product_sources FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete product_sources"
  ON public.product_sources FOR DELETE
  USING (auth.role() = 'service_role');

-- RLS Policies for chains: anyone can read, only service role can write
CREATE POLICY "Anyone can read chains"
  ON public.chains FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert chains"
  ON public.chains FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update chains"
  ON public.chains FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete chains"
  ON public.chains FOR DELETE
  USING (auth.role() = 'service_role');

-- RLS Policies for offers: anyone can read, only service role can write
CREATE POLICY "Anyone can read offers"
  ON public.offers FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update offers"
  ON public.offers FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete offers"
  ON public.offers FOR DELETE
  USING (auth.role() = 'service_role');