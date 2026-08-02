import { describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "@/config/game";
import type { RepresentativeCanvasLayer } from "@/features/game/types/representative";
import { drawRepresentativeLayers, getGridStepForZoom } from "./canvasRenderer";

describe("large-map grid levels", () => {
  it("hides details at overview zoom and simplifies intermediate zoom", () => {
    expect(getGridStepForZoom(GAME_CONFIG.coarseGridMinZoom / 2)).toBe(0);
    expect(getGridStepForZoom(GAME_CONFIG.coarseGridMinZoom)).toBe(GAME_CONFIG.coarseGridStep);
    expect(getGridStepForZoom(GAME_CONFIG.detailedGridMinZoom)).toBe(1);
  });
});

describe("representative image canvas rendering", () => {
  const layer: RepresentativeCanvasLayer = {
    ownerId: "le-sserafim",
    regionId: "le-sserafim:136,82",
    imageSrc: "/new.jpg",
    displayedImageSrc: "/new.jpg",
    coordinates: [{ x: 136, y: 82 }],
    bounds: { minX: 136, minY: 82, maxX: 136, maxY: 82 },
    opacity: 1,
    shouldRender: true,
    image: {} as CanvasImageSource,
    imageWidth: 1600,
    imageHeight: 900,
    placement: {
      source: { x: 350, y: 0, width: 900, height: 900 },
      destination: { x: 3808, y: 2296, width: 28, height: 28 },
    },
    renderRevision: 2,
    fallback: false,
  };

  function createContext() {
    return {
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
  }

  it("draws a centrally moved representative region when it is visible and clipped", () => {
    const context = createContext();
    drawRepresentativeLayers(
      context,
      [layer],
      { offsetX: -3720, offsetY: -2200, zoom: 1, width: 600, height: 400 },
      { startX: 130, endX: 151, startY: 78, endY: 93 },
      28,
    );
    expect(context.rect).toHaveBeenCalledTimes(1);
    expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.drawImage).toHaveBeenCalledWith(
      layer.image,
      350,
      0,
      900,
      900,
      88,
      96,
      28,
      28,
    );
  });

  it("does not draw when the clip path has no visible region tile", () => {
    const context = createContext();
    drawRepresentativeLayers(
      context,
      [layer],
      { offsetX: 0, offsetY: 0, zoom: 1, width: 600, height: 400 },
      { startX: 0, endX: 10, startY: 0, endY: 10 },
      28,
    );
    expect(context.clip).not.toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
