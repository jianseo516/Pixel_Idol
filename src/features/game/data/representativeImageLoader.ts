export interface LoadableImage {
  src: string;
  readonly complete?: boolean;
  onload: ((this: GlobalEventHandlers, event: Event) => unknown) | null;
  onerror: ((this: GlobalEventHandlers, event: Event) => unknown) | null;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface RepresentativeImageLoaderDiagnostic {
  readonly event: "request" | "onload" | "onerror" | "commit" | "dispose";
  readonly idolId: string;
  readonly requestedUrl: string;
  readonly resolvedUrl: string;
  readonly complete: boolean;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly generation: number;
  readonly isLatestGeneration: boolean;
  readonly committed: boolean;
  readonly revision: number;
}

interface ActiveRequest<ImageType extends LoadableImage> {
  readonly url: string;
  readonly revision: number;
  readonly images: ImageType[];
}

export interface LoadedRepresentativeImage<ImageType extends LoadableImage> {
  readonly ownerId: string;
  readonly requestedUrl: string;
  readonly resolvedUrl: string;
  readonly image: ImageType;
  readonly revision: number;
  readonly fallback: boolean;
}

export function createRepresentativeImageLoader<ImageType extends LoadableImage>(
  createImage: () => ImageType,
  diagnose?: (diagnostic: RepresentativeImageLoaderDiagnostic) => void,
) {
  const requests = new Map<string, ActiveRequest<ImageType>>();
  let revision = 0;
  let disposed = false;

  const isCurrent = (ownerId: string, url: string, requestRevision: number) => {
    const current = requests.get(ownerId);
    return !disposed && current?.url === url && current.revision === requestRevision;
  };

  const detach = (request: ActiveRequest<ImageType> | undefined) => {
    for (const image of request?.images ?? []) {
      image.onload = null;
      image.onerror = null;
    }
  };

  const report = (
    event: RepresentativeImageLoaderDiagnostic["event"],
    ownerId: string,
    requestedUrl: string,
    resolvedUrl: string,
    image: ImageType | null,
    generation: number,
    committed = false,
  ) => diagnose?.({
    event,
    idolId: ownerId,
    requestedUrl,
    resolvedUrl,
    complete: image?.complete ?? false,
    naturalWidth: image?.naturalWidth ?? 0,
    naturalHeight: image?.naturalHeight ?? 0,
    generation,
    isLatestGeneration: isCurrent(ownerId, requestedUrl, generation),
    committed,
    revision,
  });

  return {
    request(
      ownerId: string,
      url: string,
      fallbackUrl: string,
      commit: (loaded: LoadedRepresentativeImage<ImageType>) => void,
    ): boolean {
      if (disposed) return false;
      const current = requests.get(ownerId);
      if (current?.url === url) return false;
      detach(current);
      const requestRevision = ++revision;
      const images: ImageType[] = [];
      requests.set(ownerId, { url, revision: requestRevision, images });
      report("request", ownerId, url, url, null, requestRevision);

      const load = (resolvedUrl: string, fallback: boolean) => {
        const image = createImage();
        images.push(image);
        image.onload = () => {
          const currentRequest = isCurrent(ownerId, url, requestRevision);
          report("onload", ownerId, url, resolvedUrl, image, requestRevision);
          if (!currentRequest) return;
          commit({ ownerId, requestedUrl: url, resolvedUrl, image, revision: requestRevision, fallback });
          report("commit", ownerId, url, resolvedUrl, image, requestRevision, true);
        };
        image.onerror = () => {
          const currentRequest = isCurrent(ownerId, url, requestRevision);
          report("onerror", ownerId, url, resolvedUrl, image, requestRevision);
          if (!currentRequest) return;
          if (!fallback && fallbackUrl !== url) load(fallbackUrl, true);
        };
        image.src = resolvedUrl;
      };
      load(url, false);
      return true;
    },
    retain(ownerIds: ReadonlySet<string>): void {
      for (const [ownerId, request] of requests) {
        if (!ownerIds.has(ownerId)) {
          detach(request);
          requests.delete(ownerId);
        }
      }
    },
    dispose(): void {
      disposed = true;
      for (const [ownerId, request] of requests) {
        report("dispose", ownerId, request.url, request.url, null, request.revision);
        detach(request);
      }
      requests.clear();
    },
  };
}
