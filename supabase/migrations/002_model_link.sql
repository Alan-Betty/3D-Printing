alter table public.sales
  add column if not exists model_link text;

notify pgrst, 'reload schema';
