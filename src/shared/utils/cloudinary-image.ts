import { PixelRatio } from "react-native";

/** Sizes we ask for, so the same picture is reused from cache across screens. */
const WIDTHS = [160, 320, 480, 640, 800, 1080, 1440];

/**
 * A Cloudinary picture at the size it's shown, in the lightest format the
 * phone supports (f_auto) and quality Cloudinary picks (q_auto). Anything that
 * isn't a plain Cloudinary upload is returned as it is.
 *
 *   …/image/upload/v123/event.jpg → …/image/upload/f_auto,q_auto,c_limit,w_800/v123/event.jpg
 */
export const sizedImageUri = (uri: string, shownWidth: number) => {
  const marker = "/image/upload/";
  const at = uri.indexOf(marker);
  if (!uri.includes("res.cloudinary.com") || at === -1 || shownWidth <= 0) return uri;
  const rest = uri.slice(at + marker.length);
  // Already sized or transformed (e.g. "w_400,h_300/…"): leave it alone.
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return uri;
  const pixels = PixelRatio.getPixelSizeForLayoutSize(shownWidth);
  const width = WIDTHS.find((w) => w >= pixels) ?? WIDTHS[WIDTHS.length - 1];
  return `${uri.slice(0, at + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
};
