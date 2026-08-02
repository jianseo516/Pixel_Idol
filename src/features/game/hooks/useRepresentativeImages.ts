"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getLocalIdolImageFallback } from "@/features/game/data/idolImageUpload";
import {
  createRepresentativeImageLoader,
  type LoadedRepresentativeImage,
} from "@/features/game/data/representativeImageLoader";
import {
  calculateCoverPlacement,
  getRegionWorldRectangle,
} from "@/features/game/rendering/representativeImage";
import type {
  RepresentativeCanvasLayer,
  RepresentativeCanvasLayerSpec,
} from "@/features/game/types/representative";

type LoadedBrowserImage = LoadedRepresentativeImage<HTMLImageElement>;

export function useRepresentativeImages(
  specs: readonly RepresentativeCanvasLayerSpec[],
): readonly RepresentativeCanvasLayer[] {
  const loaderRef = useRef<ReturnType<typeof createRepresentativeImageLoader<HTMLImageElement>> | null>(null);
  const [loadedByOwner, setLoadedByOwner] = useState<Readonly<Record<string, LoadedBrowserImage>>>({});

  useEffect(() => {
    const loader = createRepresentativeImageLoader(
      () => new Image(),
      process.env.NODE_ENV === "development"
        ? (diagnostic) => console.debug("[representative-image-loader]", diagnostic)
        : undefined,
    );
    loaderRef.current = loader;

    return () => {
      loader.dispose();
      if (loaderRef.current === loader) loaderRef.current = null;
    };
  }, []);

  useEffect(() => {
    const activeOwners = new Set(specs.map((spec) => spec.ownerId));
    loaderRef.current?.retain(activeOwners);
    for (const spec of specs) {
      if (!spec.shouldRender) continue;
      loaderRef.current?.request(
        spec.ownerId,
        spec.imageSrc,
        getLocalIdolImageFallback(spec.ownerId),
        (loaded) => {
          setLoadedByOwner((current) => ({ ...current, [loaded.ownerId]: loaded }));
        },
      );
    }
  }, [specs]);

  const layers = useMemo(() => specs.flatMap((spec) => {
    if (!spec.shouldRender) return [];
    const loaded = loadedByOwner[spec.ownerId];
    // 새 URL의 로딩이 끝날 때까지 마지막으로 성공한 이미지를 유지한다.
    if (!loaded) return [];
    const imageSize = { width: loaded.image.naturalWidth, height: loaded.image.naturalHeight };
    if (imageSize.width <= 0 || imageSize.height <= 0) return [];
    return [{
      ...spec,
      image: loaded.image,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      placement: calculateCoverPlacement(imageSize, getRegionWorldRectangle(spec.bounds)),
      renderRevision: loaded.revision,
      fallback: loaded.fallback,
      displayedImageSrc: loaded.resolvedUrl,
    }];
  }), [loadedByOwner, specs]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[representative-image-layers]", {
      revision: layers.reduce((maximum, layer) => Math.max(maximum, layer.renderRevision), 0),
      layerCount: layers.length,
      layers: layers.map((layer) => ({
        idolId: layer.ownerId,
        displayedUrl: layer.displayedImageSrc,
        requestedUrl: layer.imageSrc,
        naturalWidth: layer.imageWidth,
        naturalHeight: layer.imageHeight,
        revision: layer.renderRevision,
      })),
    });
  }, [layers]);

  return layers;
}
