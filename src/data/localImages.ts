export interface LocalImage {
  name: string;
  url: string;
}

/**
 * Auto-discovers reference photos placed in src/assets/images/. Drop a file in
 * the folder and it appears in the app's built-in image picker — no config.
 */
const files = import.meta.glob("../assets/images/*.{png,jpg,jpeg,webp,gif,svg,PNG,JPG,JPEG,WEBP,GIF,SVG}", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const LOCAL_IMAGES: LocalImage[] = Object.entries(files)
  .map(([path, url]) => ({ name: path.split("/").pop() ?? path, url }))
  .sort((a, b) => a.name.localeCompare(b.name));
