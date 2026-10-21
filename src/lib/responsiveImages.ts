import {posterUrl} from "../portfolio/v3PortfolioData";
import manifest from "./responsive-images.manifest.json";

export type ResponsiveImageMetadata = {width: number; height: number; srcSet: string};
const images: Partial<Record<string, ResponsiveImageMetadata>> = manifest;

export const responsiveImageMetadata = (src: string) => images[src];
export const responsiveSrcSet = (src: string, minimumWidth = 0) => {
  const image = images[src];
  return image?.srcSet.split(", ").filter((candidate) => {
    const width = Number(candidate.match(/ (\d+)w$/u)?.[1]);
    return width >= minimumWidth || width === image.width;
  }).join(", ");
};

// HTML auto-sizes applies only to lazy images; keep the authored fallback for older browsers.
// https://html.spec.whatwg.org/dev/images.html#sizes-attributes
export const lazyImageSizes = (fallback: string) => fallback.startsWith("auto,") ? fallback : `auto, ${fallback}`;

export const posterSrcSet = (id: string, minimumWidth = 0) => responsiveSrcSet(posterUrl(id), minimumWidth);
