import { noteMarkdown } from "@/lib/files";
import type { Block } from "@/lib/domain";
async function embed(url: string) {
  if (!url.startsWith("/api/assets/")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error("导出资源失败，请重试");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("资源读取失败"));
    r.readAsDataURL(blob);
  });
}
export async function exportNote(
  format: "md" | "json",
  page: any,
  blocks: Block[],
  tags: string[],
) {
  const copied = structuredClone(blocks);
  for (const b of copied) {
    if (b.type === "image") b.content.url = await embed(b.content.url || "");
    if (b.type === "gallery")
      for (const img of b.content.images || [])
        img.url = await embed(img.url || "");
    if (
      ["file", "video", "link"].includes(b.type) &&
      b.content.url?.startsWith("/api/assets/")
    )
      b.content.url =
        format === "json"
          ? await embed(b.content.url)
          : new URL(b.content.url, location.origin).toString();
  }
  const payload =
    format === "md"
      ? noteMarkdown(page.title, copied, tags)
      : JSON.stringify(
          {
            format: "zhixu-note",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            page: {
              title: page.title,
              kind: page.kind,
              subject: page.subject_name || null,
              fileType: page.file_type || "note",
              sourcePath: page.source_path || null,
            },
            tags,
            blocks: copied,
          },
          null,
          2,
        );
  const blob = new Blob([payload], {
      type:
        format === "md"
          ? "text/markdown;charset=utf-8"
          : "application/json;charset=utf-8",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download =
    (page.title || "笔记").replace(/[\\/:*?"<>|]/g, "_") + "." + format;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
