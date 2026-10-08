import type { Block } from "./domain";
export const fileGroups = [
  { value: "note", label: "笔记" },
  { value: "code", label: "代码" },
  { value: "document", label: "文档" },
  { value: "image", label: "图片" },
  { value: "notebook", label: "Notebook" },
  { value: "mindmap", label: "思维导图" },
  { value: "folder", label: "文件夹" },
  { value: "other", label: "其他文件" },
];
const codeExt: Record<string, string> = {
  py: "python",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  htm: "html",
  css: "css",
  sql: "sql",
  sh: "shell",
  bat: "shell",
  ps1: "shell",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "plaintext",
  xml: "xml",
  rs: "rust",
  go: "go",
  rb: "ruby",
  r: "r",
  ipynb: "python",
};
export function classifyFile(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "ipynb") return "notebook";
  if (codeExt[ext]) return "code";
  if (
    [
      "md",
      "markdown",
      "txt",
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "csv",
      "xlsx",
      "xls",
    ].includes(ext)
  )
    return "document";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return "other";
}
export function fileLanguage(name: string) {
  return codeExt[name.toLowerCase().split(".").pop() || ""] || "plaintext";
}
export function inferPageGroup(p: any, blocks?: Block[]) {
  if (p.kind === "文件夹") return "folder";
  if (p.source_path) return p.file_type || classifyFile(p.source_path);
  if (p.file_type && p.file_type !== "note") return p.file_type;
  if (p.kind === "代码案例") return "code";
  if (blocks) {
    if (
      blocks.length &&
      blocks.every((b) => b.type === "code" || b.type === "html")
    )
      return "code";
    if (
      blocks.length &&
      blocks.every((b) => b.type === "image" || b.type === "gallery")
    )
      return "image";
    if (
      blocks.length &&
      blocks.every((b) => b.type === "mindmap" || b.type === "mermaid")
    )
      return "mindmap";
  }
  return "note";
}
export function safeImportPath(input: string) {
  const path = input.replace(/\\/g, "/");
  if (
    path.length > 900 ||
    path.startsWith("/") ||
    /^[a-z]:/i.test(path) ||
    path.includes("\0")
  )
    throw new Error("文件路径不正确");
  const parts = path.split("/");
  if (parts.some((p) => !p || p === "." || p === ".." || p.length > 200))
    throw new Error("文件路径不正确");
  if (parts.length > 24) throw new Error("目录层级不能超过 24 层");
  return parts;
}
export function blockMarkdown(b: Block): string {
  const c = b.content || {},
    t = c.text || "",
    fence = (code: string, language = "") => {
      const matches = code.match(/`{3,}/g) || [];
      const mark = "`".repeat(Math.max(3, ...matches.map((v) => v.length + 1)));
      return `${mark}${language}\n${code}\n${mark}`;
    };
  let result = "";
  switch (b.type) {
    case "heading":
      result = "## " + t;
      break;
    case "text":
    case "markdown":
    case "ai":
      result = t;
      break;
    case "quote":
    case "callout":
      result = t
        .split("\n")
        .map((l: string) => "> " + l)
        .join("\n");
      break;
    case "todo":
      result = `- [${c.done ? "x" : " "}] ${t}`;
      break;
    case "toggle":
      result = `<details>\n<summary>${t.split("\n")[0]}</summary>\n\n${t.split("\n").slice(1).join("\n")}\n</details>`;
      break;
    case "code":
      result =
        fence(c.code || "", c.language || "") +
        (c.explanation ? "\n\n" + c.explanation : "") +
        (c.input ? "\n\n输入：\n" + fence(c.input) : "") +
        (c.output ? "\n\n输出：\n" + fence(c.output) : "") +
        (c.error ? "\n\n错误：\n" + fence(c.error) : "");
      break;
    case "math":
      result = "$$\n" + t + "\n$$";
      break;
    case "mermaid":
      result = fence(t, "mermaid");
      break;
    case "mindmap": {
      const ns = c.nodes || [],
        visit = (id: string, level = 0, seen = new Set<string>()): string => {
          const n = ns.find((x: any) => x.id === id);
          if (!n || seen.has(id)) return "";
          const next = new Set(seen);
          next.add(id);
          return (
            "  ".repeat(level) +
            "- " +
            n.text +
            "\n" +
            ns
              .filter((x: any) => x.parent === id)
              .map((x: any) => visit(x.id, level + 1, next))
              .join("")
          );
        };
      result = ns
        .filter((n: any) => !n.parent)
        .map((n: any) => visit(n.id))
        .join("\n");
      break;
    }
    case "html":
      result =
        fence(c.html || "", "html") +
        "\n\n" +
        fence(c.css || "", "css") +
        "\n\n" +
        fence(c.js || "", "javascript");
      break;
    case "image":
      result = `![${c.name || "学习截图"}](${c.url || ""})`;
      break;
    case "gallery":
      result = (c.images || [])
        .map((v: any) => `![${v.name || ""}](${v.url})`)
        .join("\n\n");
      break;
    case "file":
    case "link":
    case "video":
      result = `[${c.name || c.url || "资源"}](${c.url || ""})`;
      break;
    case "table": {
      const lines = t.split("\n").map((l: string) => "| " + l + " |");
      lines.splice(
        1,
        0,
        "| " +
          (t.split("\n")[0]?.split("|") || []).map(() => "---").join(" | ") +
          " |",
      );
      result = lines.join("\n");
      break;
    }
    default:
      result = t || JSON.stringify(c);
  }
  return (b.aiGenerated ? "> AI 生成\n\n" : "") + result;
}
export function noteMarkdown(
  title: string,
  blocks: Block[],
  tags: string[] = [],
) {
  return (
    "# " +
    title +
    "\n\n" +
    (tags.length ? tags.map((t) => "#" + t).join(" ") + "\n\n" : "") +
    blocks.map(blockMarkdown).join("\n\n") +
    "\n"
  );
}
