type ModuleLoader<T> = () => Promise<T>;

export function createModulePreloader<T>(loader: ModuleLoader<T>) {
  let promise: Promise<T> | null = null;

  return () => {
    if (!promise) {
      promise = loader().catch((error: unknown) => {
        promise = null;
        throw error;
      });
    }
    return promise;
  };
}

const decodedImages = new Map<string, Promise<void>>();

export function preloadDecodedImage(src: string): Promise<void> {
  const existing = decodedImages.get(src);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(resolve, reject);
        return;
      }
      resolve();
    };
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  }).catch((error: unknown) => {
    decodedImages.delete(src);
    throw error;
  });

  decodedImages.set(src, promise);
  return promise;
}

export async function preloadDecodedImages(sources: readonly string[]): Promise<void> {
  await Promise.all(sources.map((src) => preloadDecodedImage(src)));
}

export const TITLE_CRITICAL_ASSETS = ["/assets/scenes/bg-office-night.jpg"] as const;

export const CASTING_CRITICAL_ASSETS = [
  "/assets/portraits/suming-base.png",
  "/assets/portraits/zhou-neutral.png",
] as const;
