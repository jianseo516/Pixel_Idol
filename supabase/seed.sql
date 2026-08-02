insert into public.seasons (id, name, starts_at, ends_at, status, map_width, map_height)
values ('season-1', '공동 플레이 데모 시즌 1', '2025-01-01T00:00:00Z', '2030-01-01T00:00:00Z', 'active', 90, 54)
on conflict (id) do update set
  name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  status = excluded.status, map_width = excluded.map_width, map_height = excluded.map_height;

insert into public.idols (id, name, color, representative_image_src, sort_order) values
  ('lumi', '루미', '#F43F5E', '/mock-idols/lumi.svg', 1),
  ('nova', '노바', '#3B82F6', '/mock-idols/nova.svg', 2),
  ('muse', '뮤즈', '#22C55E', '/mock-idols/muse.svg', 3)
on conflict (id) do update set
  name = excluded.name, color = excluded.color,
  representative_image_src = excluded.representative_image_src,
  sort_order = excluded.sort_order;

insert into public.tiles (season_id, x, y, owner_id, hp) values
  ('season-1', 5, 5, 'lumi', 5), ('season-1', 6, 5, 'lumi', 5),
  ('season-1', 5, 6, 'lumi', 5), ('season-1', 6, 6, 'lumi', 5),
  ('season-1', 44, 26, 'nova', 5), ('season-1', 45, 26, 'nova', 5),
  ('season-1', 44, 27, 'nova', 5), ('season-1', 45, 27, 'nova', 5),
  ('season-1', 83, 47, 'muse', 5), ('season-1', 84, 47, 'muse', 5),
  ('season-1', 83, 48, 'muse', 5), ('season-1', 84, 48, 'muse', 5)
on conflict (season_id, x, y) do update set owner_id = excluded.owner_id, hp = excluded.hp;
