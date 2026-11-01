import { Fragment, type ReactNode } from "react";

// The assistant writes plain text with short headings (###), lists, small tables and **bold**. This shows those and
// nothing else (no links or HTML), so a reply can't inject anything into the page. It reads line by line, so a half
// written table or list still shows sensibly while the reply streams in.

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "paragraph"; text: string };

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*(\d+)[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
// The line under a table's head: |---|:---:|
const DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function special(line: string) {
  return HEADING.test(line) || BULLET.test(line) || NUMBER.test(line) || RULE.test(line) || line.trim().startsWith("|");
}

function blocks(text: string): Block[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const found: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || RULE.test(line)) {
      index += 1;
    } else if (HEADING.test(line)) {
      found.push({ kind: "heading", text: line.replace(HEADING, "").replace(/\s*#+\s*$/, "") });
      index += 1;
    } else if (line.trim().startsWith("|") && DIVIDER.test(lines[index + 1] ?? "")) {
      const head = cells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      found.push({ kind: "table", head, rows });
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line);
      const pattern = ordered ? NUMBER : BULLET;
      const items: string[] = [];
      const start = ordered ? Number(NUMBER.exec(line)?.[1] ?? 1) : 1;
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(lines[index].replace(pattern, ""));
        index += 1;
      }
      found.push({ kind: "list", ordered, start, items });
    } else {
      const paragraph = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !special(lines[index])) {
        paragraph.push(lines[index]);
        index += 1;
      }
      found.push({ kind: "paragraph", text: paragraph.join("\n") });
    }
  }
  return found;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2.5">
      {blocks(text).map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p key={index} className="pt-1 font-semibold text-balance text-foreground">
              {inline(block.text)}
            </p>
          );
        }
        if (block.kind === "list") {
          const items = block.items.map((item, number) => <li key={number}>{inline(item)}</li>);
          return block.ordered ? (
            <ol key={index} start={block.start} className="list-decimal space-y-1 pl-5">
              {items}
            </ol>
          ) : (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {items}
            </ul>
          );
        }
        if (block.kind === "table") {
          return (
            // Focusable, so a table wider than the panel can be scrolled from the keyboard.
            <div
              key={index}
              tabIndex={0}
              className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    {block.head.map((cell, column) => (
                      <th key={column} scope="col" className="px-2.5 py-1.5 font-medium whitespace-nowrap text-foreground">
                        {inline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {block.rows.map((row, number) => (
                    <tr key={number}>
                      {block.head.map((_cell, column) => (
                        <td key={column} className="min-w-28 px-2.5 py-1.5 align-top">
                          {inline(row[column] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
