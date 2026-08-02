import type {
  Coordinate,
  Idol,
  TerritoryBounds,
} from "@/features/game/types/game";

export type RepresentativeImageFit = "cover" | "contain";

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ImagePlacement {
  readonly source: Rectangle;
  readonly destination: Rectangle;
}

export interface TerritoryImageSafeRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  readonly area: number;
}

export interface RepresentativeImageSlot {
  readonly safeRect: TerritoryImageSafeRect;
  readonly destination: Rectangle;
  readonly scale: number;
  readonly displayedArea: number;
}

export interface RepresentativeCanvasLayerSpec {
  readonly ownerId: Idol["id"];
  readonly regionId: string;
  readonly imageSrc: string;
  readonly coordinates: readonly Coordinate[];
  readonly bounds: TerritoryBounds;
  readonly opacity: number;
}

export interface RepresentativeCanvasLayer
  extends RepresentativeCanvasLayerSpec {
  readonly image: CanvasImageSource;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly slot: RepresentativeImageSlot;
}
