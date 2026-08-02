"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  RepresentativeCanvasLayer,
  RepresentativeCanvasLayerSpec,
} from "@/features/game/types/representative";
import { getRepresentativeImageSlot } from "@/features/game/rendering/representativeImage";

export function useRepresentativeImages(
  specs: readonly RepresentativeCanvasLayerSpec[],
): readonly RepresentativeCanvasLayer[] {
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const [loadedImages, setLoadedImages] = useState<
    Readonly<Record<string, HTMLImageElement>>
  >({});
  const sourceKey = useMemo(
    () => [...new Set(specs.map((spec) => spec.imageSrc))].sort().join("|"),
    [specs],
  );
  useEffect(() => {
    let active = true;
    const pendingImages: HTMLImageElement[] = [];
    const sources = sourceKey ? sourceKey.split("|") : [];

    for (const source of sources) {
      const cached = imageCacheRef.current.get(source);
      if (cached?.complete && cached.naturalWidth > 0) {
        setLoadedImages((current) => ({ ...current, [source]: cached }));
        continue;
      }
      if (cached) {
        continue;
      }

      const image = new Image();
      imageCacheRef.current.set(source, image);
      pendingImages.push(image);
      image.onload = () => {
        if (active) {
          setLoadedImages((current) => ({ ...current, [source]: image }));
        }
      };
      image.onerror = () => {
        imageCacheRef.current.delete(source);
      };
      image.src = source;
    }

    return () => {
      active = false;
      for (const image of pendingImages) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [sourceKey]);

  return useMemo(
    () =>
      specs.flatMap((spec) => {
        const image = loadedImages[spec.imageSrc];
        const slot = image
          ? getRepresentativeImageSlot(spec.coordinates, {
              width: image.naturalWidth,
              height: image.naturalHeight,
            })
          : null;
        return image && slot
          ? [
              {
                ...spec,
                image,
                imageWidth: image.naturalWidth,
                imageHeight: image.naturalHeight,
                slot,
              },
            ]
          : [];
      }),
    [loadedImages, specs],
  );
}
