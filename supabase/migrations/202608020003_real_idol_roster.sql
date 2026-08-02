-- 개발 단계의 더미 roster를 폐기하는 일회성 초기화 migration이다.
-- players와 tiles를 모두 삭제하므로 프로덕션 운영 시작 이후에는 절대로 다시 실행하지 않는다.
begin;

delete from public.players;
delete from public.tiles;
delete from public.idols;

insert into public.idols (id, name, color, representative_image_src, sort_order) values
  ('bts', 'BTS', '#7C3AED', '/mock-idols/bts.svg', 1),
  ('blackpink', 'BLACKPINK', '#EC4899', '/mock-idols/blackpink.svg', 2),
  ('seventeen', 'SEVENTEEN', '#06B6D4', '/mock-idols/seventeen.svg', 3),
  ('stray-kids', 'Stray Kids', '#EF4444', '/mock-idols/stray-kids.svg', 4),
  ('aespa', 'aespa', '#2563EB', '/mock-idols/aespa.svg', 5),
  ('ive', 'IVE', '#F59E0B', '/mock-idols/ive.svg', 6),
  ('enhypen', 'ENHYPEN', '#10B981', '/mock-idols/enhypen.svg', 7),
  ('le-sserafim', 'LE SSERAFIM', '#84CC16', '/mock-idols/le-sserafim.svg', 8);

insert into public.tiles (season_id, x, y, owner_id, hp) values
  ('season-1', 5, 5, 'bts', 5), ('season-1', 6, 5, 'bts', 5),
  ('season-1', 5, 6, 'bts', 5), ('season-1', 6, 6, 'bts', 5),
  ('season-1', 33, 5, 'blackpink', 5), ('season-1', 34, 5, 'blackpink', 5),
  ('season-1', 33, 6, 'blackpink', 5), ('season-1', 34, 6, 'blackpink', 5),
  ('season-1', 70, 5, 'seventeen', 5), ('season-1', 71, 5, 'seventeen', 5),
  ('season-1', 70, 6, 'seventeen', 5), ('season-1', 71, 6, 'seventeen', 5),
  ('season-1', 10, 25, 'stray-kids', 5), ('season-1', 11, 25, 'stray-kids', 5),
  ('season-1', 10, 26, 'stray-kids', 5), ('season-1', 11, 26, 'stray-kids', 5),
  ('season-1', 43, 25, 'aespa', 5), ('season-1', 44, 25, 'aespa', 5),
  ('season-1', 43, 26, 'aespa', 5), ('season-1', 44, 26, 'aespa', 5),
  ('season-1', 75, 25, 'ive', 5), ('season-1', 76, 25, 'ive', 5),
  ('season-1', 75, 26, 'ive', 5), ('season-1', 76, 26, 'ive', 5),
  ('season-1', 25, 45, 'enhypen', 5), ('season-1', 26, 45, 'enhypen', 5),
  ('season-1', 25, 46, 'enhypen', 5), ('season-1', 26, 46, 'enhypen', 5),
  ('season-1', 65, 45, 'le-sserafim', 5), ('season-1', 66, 45, 'le-sserafim', 5),
  ('season-1', 65, 46, 'le-sserafim', 5), ('season-1', 66, 46, 'le-sserafim', 5);

commit;
