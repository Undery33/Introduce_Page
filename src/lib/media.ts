export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export function imageIdFromUrl(value: unknown): string | null {
  return typeof value === "string"
    ? (/^\/media\/([a-f0-9]{32})\.webp$/.exec(value)?.[1] ?? null)
    : null;
}
export function imageUrl(id: string): string {
  return `/media/${id}.webp`;
}
export type UploadedImageResult = {
  id: string;
  url: string;
  width: number;
  height: number;
};
export type IconOption = { value: string; label: string };
export const builtInIcons: readonly IconOption[] = [
  { value: "code", label: "코드" },
  { value: "server", label: "서버" },
  { value: "globe", label: "네트워크" },
  { value: "ubuntu", label: "Ubuntu" },
  { value: "rocky", label: "Rocky Linux" },
];
