do $$
begin
  alter publication supabase_realtime add table public.tiles;
exception
  when duplicate_object then null;
end;
$$;
