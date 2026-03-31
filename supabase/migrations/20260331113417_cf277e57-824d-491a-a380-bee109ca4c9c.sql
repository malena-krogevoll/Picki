
-- Create user_favorite_products table
create table public.user_favorite_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ean text not null,
  product_name text not null,
  brand text,
  image_url text,
  search_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, ean)
);

alter table public.user_favorite_products enable row level security;

-- RLS policies: users can only manage their own favorites
create policy "Users can view their own favorite products"
  on public.user_favorite_products for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own favorite products"
  on public.user_favorite_products for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorite products"
  on public.user_favorite_products for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own favorite products"
  on public.user_favorite_products for update
  to authenticated
  using (auth.uid() = user_id);
