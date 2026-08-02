insert into public.seasons (id, name, starts_at, ends_at, status, map_width, map_height)
values ('season-1', '공동 플레이 데모 시즌 1', '2025-01-01T00:00:00Z', '2030-01-01T00:00:00Z', 'active', 360, 216)
on conflict (id) do update set
  name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  status = excluded.status, map_width = excluded.map_width, map_height = excluded.map_height;

insert into public.idols (id, name, color, representative_image_src, sort_order) values
  ('bts', 'BTS', '#7C3AED', '/mock-idols/bts.svg', 1),
  ('blackpink', 'BLACKPINK', '#EC4899', '/mock-idols/blackpink.svg', 2),
  ('seventeen', 'SEVENTEEN', '#06B6D4', '/mock-idols/seventeen.svg', 3),
  ('stray-kids', 'Stray Kids', '#EF4444', '/mock-idols/stray-kids.svg', 4),
  ('aespa', 'aespa', '#2563EB', '/mock-idols/aespa.svg', 5),
  ('ive', 'IVE', '#F59E0B', '/mock-idols/ive.svg', 6),
  ('enhypen', 'ENHYPEN', '#10B981', '/mock-idols/enhypen.svg', 7),
  ('le-sserafim', 'LE SSERAFIM', '#84CC16', '/mock-idols/le-sserafim.svg', 8)
on conflict (id) do update set
  name = excluded.name, color = excluded.color,
  representative_image_src = excluded.representative_image_src,
  sort_order = excluded.sort_order;

insert into public.tiles (season_id, x, y, owner_id, hp) values
  ('season-1', 140, 86, 'bts', 5), ('season-1', 141, 86, 'bts', 5),
  ('season-1', 140, 87, 'bts', 5), ('season-1', 141, 87, 'bts', 5),
  ('season-1', 168, 86, 'blackpink', 5), ('season-1', 169, 86, 'blackpink', 5),
  ('season-1', 168, 87, 'blackpink', 5), ('season-1', 169, 87, 'blackpink', 5),
  ('season-1', 205, 86, 'seventeen', 5), ('season-1', 206, 86, 'seventeen', 5),
  ('season-1', 205, 87, 'seventeen', 5), ('season-1', 206, 87, 'seventeen', 5),
  ('season-1', 145, 106, 'stray-kids', 5), ('season-1', 146, 106, 'stray-kids', 5),
  ('season-1', 145, 107, 'stray-kids', 5), ('season-1', 146, 107, 'stray-kids', 5),
  ('season-1', 178, 106, 'aespa', 5), ('season-1', 179, 106, 'aespa', 5),
  ('season-1', 178, 107, 'aespa', 5), ('season-1', 179, 107, 'aespa', 5),
  ('season-1', 210, 106, 'ive', 5), ('season-1', 211, 106, 'ive', 5),
  ('season-1', 210, 107, 'ive', 5), ('season-1', 211, 107, 'ive', 5),
  ('season-1', 160, 126, 'enhypen', 5), ('season-1', 161, 126, 'enhypen', 5),
  ('season-1', 160, 127, 'enhypen', 5), ('season-1', 161, 127, 'enhypen', 5),
  ('season-1', 200, 126, 'le-sserafim', 5), ('season-1', 201, 126, 'le-sserafim', 5),
  ('season-1', 200, 127, 'le-sserafim', 5), ('season-1', 201, 127, 'le-sserafim', 5)
on conflict (season_id, x, y) do update set owner_id = excluded.owner_id, hp = excluded.hp;
