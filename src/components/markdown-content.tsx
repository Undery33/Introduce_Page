import { Fragment, type ReactNode } from "react";

// A deliberately bounded Markdown subset. HTML/MDX is never executed.
export function safeContentUrl(value: string): string | null {
  if (
    /^[\s\u0000-\u001f\u007f]|[\u0000-\u001f\u007f]/.test(value) ||
    value.includes("\\")
  )
    return null;
  if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z0-9_-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function inline(value: string): ReactNode[] {
  const pattern =
    /(`[^`\n]+`|!\[[^\]\n]*\]\([^\s)]+\)|\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  return value
    .split(pattern)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={index}>{part.slice(1, -1)}</code>;
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={index}>{part.slice(1, -1)}</em>;
      const link = part.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);
      if (link) {
        const url = safeContentUrl(link[3]);
        if (url)
          return link[1] ? (
            // eslint-disable-next-line @next/next/no-img-element -- Author-supplied URLs are bounded and do not use the Next image proxy.
            <img
              key={index}
              src={url}
              alt={link[2]}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          ) : (
            <a key={index} href={url} rel="noopener noreferrer">
              {link[2]}
            </a>
          );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}
export function MarkdownContent({ source }: { source: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const output: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = index;
    if (!line.trim()) {
      index++;
      continue;
    }
    const fence = line.match(/^\s*```([^`]*)$/);
    if (fence) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index]))
        code.push(lines[index++]);
      if (index < lines.length) index++;
      output.push(
        <div key={key}>
          <small>{fence[1].trim()}</small>
          <pre tabIndex={0} style={{ overflowX: "auto" }}>
            <code>{code.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      output.push(<h3 key={key}>{inline(heading[2])}</h3>);
      index++;
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push(<hr key={key} />);
      index++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]))
        quote.push(lines[index++].replace(/^>\s?/, ""));
      output.push(
        <blockquote key={key}>{inline(quote.join("\n"))}</blockquote>,
      );
      continue;
    }
    const list = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
    if (list) {
      const ordered = !list[1];
      const items: ReactNode[] = [];
      const regex = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(regex);
        if (!item) break;
        items.push(<li key={index++}>{inline(item[1])}</li>);
      }
      output.push(
        ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>,
      );
      continue;
    }
    if (
      line.includes("|") &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
        lines[index + 1] ?? "",
      )
    ) {
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
      const header = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      )
        rows.push(cells(lines[index++]));
      output.push(
        <div key={key} style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {header.map((cell, i) => (
                  <th key={i}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {header.map((_, j) => (
                    <td key={j}>{inline(row[j] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(?:#{1,6}\s|\s*```|>\s?|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[index])
    )
      paragraph.push(lines[index++]);
    output.push(
      <p key={key} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {inline(paragraph.join("\n"))}
      </p>,
    );
  }
  return <div data-markdown>{output}</div>;
}
