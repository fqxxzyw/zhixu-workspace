import { env } from "cloudflare:workers";
import { run, uuid, now, Fault } from "./server";
import { classifyFile } from "./files";
const mimeByExt: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ipynb: "application/json",
  json: "application/json",
  csv: "text/csv",
};
export function validateUpload(f: File) {
  if (!f.size || f.size > 12 * 1024 * 1024)
    throw new Fault("每个文件大小必须在 1 字节至 12 MB 之间");
  const ext = f.name.toLowerCase().split(".").pop() || "";
  const group = classifyFile(f.name);
  if (group === "other" && ext !== "zip")
    throw new Fault(
      "暂不支持此文件类型，请上传代码、笔记、文档、Notebook、图片或 ZIP",
    );
  return { group, mime: mimeByExt[ext] || "text/plain", ext };
}
export async function storeUpload(
  f: File,
  space: string,
  user: string,
  original: string | null = null,
) {
  const { mime } = validateUpload(f),
    id = uuid(),
    key = space + "/" + id;
  if (!env.BUCKET) throw new Fault("上传暂时不可用", 503);
  await env.BUCKET.put(key, await f.arrayBuffer(), {
    httpMetadata: { contentType: mime },
  });
  try {
    await run(
      "INSERT INTO images(id,space_id,user_id,key,name,mime,size,original_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      space,
      user,
      key,
      f.name.slice(0, 200),
      mime,
      f.size,
      original,
      now(),
    );
  } catch (e) {
    await env.BUCKET.delete(key);
    throw e;
  }
  return { id, url: "/api/assets/" + id, name: f.name, mime, key };
}
export async function discardUpload(id: string, key: string) {
  await run("DELETE FROM images WHERE id=?", id);
  await env.BUCKET?.delete(key);
}
