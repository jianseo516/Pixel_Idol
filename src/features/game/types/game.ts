export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export interface MapSize {
  readonly width: number;
  readonly height: number;
}

export interface Idol {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export type SeasonStatus = "active" | "ended";

export interface Season {
  readonly id: string;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: SeasonStatus;
}

export interface Tile {
  readonly id: string;
  readonly seasonId: string;
  readonly coordinate: Coordinate;
  readonly ownerId: Idol["id"] | null;
  readonly hp: number;
}

export interface GameState {
  readonly mapSize: MapSize;
  readonly season: Season;
  readonly idols: Readonly<Record<Idol["id"], Idol>>;
  readonly tiles: Readonly<Record<Tile["id"], Tile>>;
  readonly supportedIdolId: Idol["id"];
  readonly tokens: number;
}

export type TileActionErrorCode =
  | "OUT_OF_BOUNDS"
  | "TILE_NOT_FOUND"
  | "SEASON_ENDED"
  | "INSUFFICIENT_TOKENS"
  | "TILE_NOT_EMPTY"
  | "NOT_ADJACENT"
  | "NOT_ENEMY_TILE"
  | "OWN_TILE";

export interface TileActionError {
  readonly code: TileActionErrorCode;
  readonly message: string;
}

export type TileActionType = "CLAIM" | "ATTACK" | "NONE";

export interface TileActionPreview {
  readonly actionType: TileActionType;
  readonly allowed: boolean;
  readonly cost: number | null;
  readonly label: string;
  readonly reasonCode: TileActionErrorCode | null;
  readonly reasonMessage: string | null;
}

export interface ActionableTiles {
  readonly claimable: readonly Coordinate[];
  readonly attackable: readonly Coordinate[];
}

export type TileActionResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly tile: Tile;
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly error: TileActionError;
    };
