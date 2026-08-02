export const GAME_CONFIG = {
  mapWidth: 90,
  mapHeight: 54,
  maxTileHp: 5,
  attackDamage: 1,
  claimTokenCost: 1,
  attackTokenCost: 1,
  initialUserTokens: 100,
  tileSize: 28,
  defaultTileDisplaySize: 32,
  minZoom: 0.2,
  maxZoom: 4,
  actionHighlightMinZoom: 0.55,
  wheelZoomIntensity: 0.0015,
  maxWheelDelta: 120,
  dragThreshold: 5,
  viewportPadding: 24,
  mapEdgePadding: 72,
  minimapWidth: 165,
  minimapHeight: 99,
} as const;

export const DEFAULT_MAP_SIZE = {
  width: GAME_CONFIG.mapWidth,
  height: GAME_CONFIG.mapHeight,
} as const;
