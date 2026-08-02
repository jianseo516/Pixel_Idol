export interface SeasonRow {
  readonly id: string;
  readonly name: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly status: "active" | "ended";
  readonly map_width: number;
  readonly map_height: number;
}

export interface IdolRow {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly representative_image_src: string;
}

export interface TileRow {
  readonly season_id: string;
  readonly x: number;
  readonly y: number;
  readonly owner_id: string;
  readonly hp: number;
  readonly updated_at: string;
}

export interface PlayerRow {
  readonly season_id: string;
  readonly user_id: string;
  readonly supported_idol_id: string;
  readonly tokens: number;
  readonly last_action_at?: string | null;
}

export interface GameSnapshotRows {
  readonly season: SeasonRow;
  readonly idols: readonly IdolRow[];
  readonly tiles: readonly TileRow[];
  readonly player: PlayerRow;
}

export interface TileActionRpcResult {
  readonly player: PlayerRow;
  readonly tile: TileRow;
}

export interface IdolImageSubmissionRow {
  readonly id: string;
  readonly season_id: string;
  readonly idol_id: string;
  readonly user_id: string;
  readonly storage_path: string;
  readonly public_url: string;
  readonly original_file_name: string;
  readonly mime_type: string;
  readonly file_size: number;
  readonly width: number;
  readonly height: number;
  readonly status: "active" | "replaced" | "removed";
  readonly created_at: string;
  readonly replaced_at: string | null;
}

export interface SubmitIdolImageRpcResult {
  readonly idol: IdolRow;
  readonly submission: IdolImageSubmissionRow;
}
