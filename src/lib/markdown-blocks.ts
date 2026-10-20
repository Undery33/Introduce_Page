import { safeContentUrl } from "@/components/markdown-content";
export type BodyBlock =
  | { kind: "text"; value: string }
  | { kind: "image"; value: string; alt: string; url: string };
// Only standalone image lines become visual blocks; code fences stay literal.
// Keeping original line endings makes switching modes lossless.
export function bodyBlocks(source: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let text = "",
    fenced = false;
  for (const line of source.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const image =
      !fenced && line.trim().match(/^!\[([^\]\n]*)\]\(([^\s)]+)\)$/);
    if (image && safeContentUrl(image[2])) {
      if (text) blocks.push({ kind: "text", value: text });
      text = "";
      blocks.push({ kind: "image", value: line, alt: image[1], url: image[2] });
    } else text += line;
  }
  if (text || !blocks.length || blocks.at(-1)?.kind === "image")
    blocks.push({ kind: "text", value: text });
  return blocks;
}
export function imageMarkdown(url: string, alt = "사진 설명") {
  return `![${alt.replace(/[\[\]\r\n]/g, " ")}](${url})`;
}
