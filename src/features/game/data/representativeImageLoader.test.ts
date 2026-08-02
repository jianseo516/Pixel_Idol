import { describe, expect, it, vi } from "vitest";
import { createRepresentativeImageLoader, type LoadableImage } from "./representativeImageLoader";

interface FakeImage extends LoadableImage { naturalWidth: number; naturalHeight: number }
function setup(diagnose?: Parameters<typeof createRepresentativeImageLoader<FakeImage>>[1]) {
  const images: FakeImage[] = [];
  const loader = createRepresentativeImageLoader(() => {
    const image: FakeImage = { src: "", complete: false, onload: null, onerror: null, naturalWidth: 100, naturalHeight: 100 };
    images.push(image);
    return image;
  }, diagnose);
  return { images, loader };
}
function fire(handler: FakeImage["onload"]): void {
  handler?.call({} as GlobalEventHandlers, {} as Event);
}

describe("representative image loader", () => {
  it("does not reload the same URL", () => {
    const { images, loader } = setup();
    const commit = vi.fn();
    expect(loader.request("bts", "/one", "/fallback", commit)).toBe(true);
    expect(loader.request("bts", "/one", "/fallback", commit)).toBe(false);
    expect(images).toHaveLength(1);
  });
  it("keeps a loaded image request cached while rendering is temporarily hidden", () => {
    const { images, loader } = setup();
    const commit = vi.fn();
    loader.request("bts", "/one", "/fallback", commit);
    fire(images[0].onload);
    loader.retain(new Set(["bts"]));
    expect(loader.request("bts", "/one", "/fallback", commit)).toBe(false);
    expect(images).toHaveLength(1);
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it("ignores an old late load and commits the newest URL", () => {
    const { images, loader } = setup();
    const commit = vi.fn();
    loader.request("bts", "/old", "/fallback", commit);
    const oldOnload = images[0].onload;
    loader.request("bts", "/new", "/fallback", commit);
    fire(oldOnload);
    fire(images[1].onload);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0].requestedUrl).toBe("/new");
  });
  it("loads fallback and commits a redraw revision after failure", () => {
    const { images, loader } = setup();
    const commit = vi.fn();
    loader.request("bts", "/broken", "/fallback", commit);
    fire(images[0].onerror);
    expect(images[1].src).toBe("/fallback");
    fire(images[1].onload);
    expect(commit.mock.calls[0][0]).toMatchObject({ requestedUrl: "/broken", fallback: true, revision: 1 });
  });
  it("does not commit after dispose", () => {
    const { images, loader } = setup();
    const commit = vi.fn();
    loader.request("bts", "/one", "/fallback", commit);
    const onload = images[0].onload;
    loader.dispose();
    fire(onload);
    expect(loader.request("bts", "/two", "/fallback", commit)).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });
  it("does not reuse a disposed loader and a remounted loader can commit", () => {
    const first = setup();
    const commit = vi.fn();
    first.loader.request("bts", "/one", "/fallback", commit);
    first.loader.dispose();
    const second = setup();
    second.loader.request("bts", "/one", "/fallback", commit);
    fire(second.images[0].onload);
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it("reports onload and commit separately with the latest generation", () => {
    const diagnose = vi.fn();
    const { images, loader } = setup(diagnose);
    loader.request("bts", "/one", "/fallback", vi.fn());
    fire(images[0].onload);
    expect(diagnose.mock.calls.map(([entry]) => entry.event)).toEqual([
      "request",
      "onload",
      "commit",
    ]);
    expect(diagnose.mock.calls.at(-1)?.[0]).toMatchObject({
      generation: 1,
      isLatestGeneration: true,
      committed: true,
      revision: 1,
    });
  });
});
