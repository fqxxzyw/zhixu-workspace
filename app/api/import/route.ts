import {
  identity,
  access,
  db,
  one,
  all,
  run,
  stmt,
  uuid,
  now,
  text,
  pageAccess,
  Fault,
} from "@/lib/server";
import { storeUpload, discardUpload, validateUpload } from "@/lib/uploads";
import { safeImportPath, classifyFile, fileLanguage } from "@/lib/files";
import { Block, newBlock, labels } from "@/lib/domain";
async function stableId(s: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
  );
  return Array.from(bytes)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
async function folder(
  space: string,
  subject: string | null,
  parent: string | null,
  name: string,
  user: string,
) {
  const found = await one(
    "SELECT id FROM pages WHERE space_id=? AND subject_id IS ? AND parent_id IS ? AND title=? AND kind='文件夹'",
    space,
    subject,
    parent,
    name,
  );
  if (found) return found.id;
  const id =
      "folder-" +
      (await stableId([space, subject || "", parent || "", name].join("|"))),
    date = now();
  await db().batch([
    stmt(
      "INSERT OR IGNORE INTO pages(id,space_id,subject_id,parent_id,title,kind,created_by,updated_by,created_at,updated_at,file_type) VALUES(?,?,?,?,?,'文件夹',?,?,?,?,'folder')",
      id,
      space,
      subject,
      parent,
      name,
      user,
      user,
      date,
      date,
    ),
    stmt(
      "INSERT OR IGNORE INTO revisions(id,page_id,version,snapshot,user_id,created_at) VALUES(?,?,?,?,?,?)",
      "revision-" + id,
      id,
      1,
      JSON.stringify({ title: name, blocks: [], tags: [] }),
      user,
      date,
    ),
  ]);
  return id;
}
const strings = (v: any) =>
  Array.isArray(v) ? v.join("") : typeof v === "string" ? v : "";
export async function POST(req: Request) {
  let asset: any;
  const embedded: any[] = [];
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
      throw new Fault("请求来源不正确", 403);
    const u = await identity(),
      form = await req.formData(),
      space = text(form.get("space"), 100);
    await access(space, u.userId, true);
    const f = form.get("file");
    if (!(f instanceof File)) throw new Fault("请选择文件");
    const { group, ext } = validateUpload(f),
      parts = safeImportPath(String(form.get("path") || f.name));
    let subject = form.get("subject") ? String(form.get("subject")) : null,
      parent = form.get("parent") ? String(form.get("parent")) : null;
    if (
      subject &&
      !(await one(
        "SELECT id FROM subjects WHERE id=? AND space_id=?",
        subject,
        space,
      ))
    )
      throw new Fault("学科不存在");
    if (parent) {
      const p = await pageAccess(parent, u.userId, true);
      if (p.space_id !== space || p.kind !== "文件夹")
        throw new Fault("请选择当前空间内的文件夹");
      subject = p.subject_id;
    }
    if (!subject && !parent && parts.length > 1) {
      const root = parts[0],
        existing = await one(
          "SELECT id FROM subjects WHERE space_id=? AND lower(name)=lower(?)",
          space,
          root,
        );
      subject =
        existing?.id ||
        "subject-" + (await stableId(space + "|" + root.toLowerCase()));
      if (!existing)
        await run(
          "INSERT OR IGNORE INTO subjects(id,space_id,name,icon) VALUES(?,?,?,?)",
          subject,
          space,
          root,
          "code",
        );
      parts.shift();
    }
    if (subject && !parent && parts.length > 1) {
      const target = await one("SELECT name FROM subjects WHERE id=?", subject);
      if (target?.name.toLowerCase() === parts[0].toLowerCase()) parts.shift();
    }
    let restoredNote = false;
    let blocks: Block[] = [],
      tags: string[] = ["导入"],
      title = parts[parts.length - 1],
      fileType = group;
    if (group === "code" && (f.size <= 650000 || ext === "json")) {
      const source = await f.text();
      if (source.includes("\0")) throw new Fault("代码文件包含二进制内容");
      if (ext === "json") {
        let data: any;
        try {
          data = JSON.parse(source);
        } catch {}
        if (data?.format === "zhixu-note" && Array.isArray(data.blocks)) {
          restoredNote = true;
          if(!subject && !parent && typeof data.page?.subject === "string" && data.page.subject.trim()){const name=text(data.page.subject,200).trim();const existing=await one("SELECT id FROM subjects WHERE space_id=? AND lower(name)=lower(?)",space,name);subject=existing?.id||"subject-"+await stableId(space+"|"+name.toLowerCase());if(!existing)await run("INSERT OR IGNORE INTO subjects(id,space_id,name,icon) VALUES(?,?,?,?)",subject,space,name,"code")}
          if (
            data.blocks.length > 120 ||
            data.blocks.some(
              (b: any) =>
                !labels[b.type] || typeof b.content !== "object" || !b.content,
            )
          )
            throw new Fault("笔记 JSON 内容格式不正确");
          blocks = data.blocks.map((b: any) => ({ ...b, id: uuid() }));
          title =
            typeof data.page?.title === "string"
              ? data.page.title.slice(0, 200)
              : title;
          tags = Array.isArray(data.tags)
            ? data.tags
                .filter((t: any) => typeof t === "string" && t.length <= 60)
                .slice(0, 20)
            : tags;
          fileType =
            data.page?.fileType &&
            [
              "note",
              "code",
              "document",
              "image",
              "notebook",
              "mindmap",
            ].includes(data.page.fileType)
              ? data.page.fileType
              : "note";
        }
      }
      if (!blocks.length && !restoredNote && f.size <= 650000)
        blocks = [
          {
            ...newBlock("code"),
            content: {
              language: fileLanguage(f.name),
              code: source,
              explanation: "",
              input: "",
              output: "",
              error: "",
            },
          },
        ];
    }
    if (group === "notebook" && f.size <= 650000) {
      let notebook: any;
      try {
        notebook = JSON.parse(await f.text());
      } catch {
        throw new Fault("Notebook JSON 格式不正确");
      }
      if (!Array.isArray(notebook.cells))
        throw new Fault("Notebook 不包含 cells");
      if (notebook.cells.length > 100)
        throw new Fault("Notebook 单元格过多，请拆分后导入");
      blocks = notebook.cells.flatMap((c: any) => {
        if (c.cell_type === "markdown")
          return [
            { ...newBlock("markdown"), content: { text: strings(c.source) } },
          ];
        if (c.cell_type === "raw")
          return [
            { ...newBlock("text"), content: { text: strings(c.source) } },
          ];
        if (c.cell_type === "code") {
          const outputs = (c.outputs || [])
            .map(
              (o: any) =>
                strings(o.text) ||
                strings(o.data?.["text/plain"]) ||
                strings(o.traceback) ||
                "",
            )
            .filter(Boolean)
            .join("\n");
          const code = {
            ...newBlock("code"),
            content: {
              language: notebook.metadata?.kernelspec?.language || "python",
              code: strings(c.source),
              output: outputs,
              explanation:
                c.execution_count != null
                  ? "Notebook 单元 [" + c.execution_count + "]"
                  : "",
              error: (c.outputs || [])
                .filter((o: any) => o.output_type === "error")
                .map((o: any) => o.ename + ": " + o.evalue)
                .join("\n"),
            },
          };
          const media: Block[] = [];
          for (const o of c.outputs || []) {
            for (const mime of ["image/png", "image/jpeg"])
              if (o.data?.[mime])
                media.push({
                  ...newBlock("image"),
                  content: {
                    url:
                      "data:" +
                      mime +
                      ";base64," +
                      strings(o.data[mime]).replace(/\s/g, ""),
                    name:
                      "Notebook 输出." + (mime === "image/png" ? "png" : "jpg"),
                  },
                });
            if (
              o.data?.["text/html"] &&
              !o.data?.["image/png"] &&
              !o.data?.["image/jpeg"]
            )
              media.push({
                ...newBlock("markdown"),
                content: { text: strings(o.data["text/html"]) },
              });
          }
          return [code, ...media];
        }
        return [];
      });
      if (!blocks.length) blocks = [newBlock("text")];
    }
    if (
      group === "document" &&
      ["md", "markdown", "txt", "csv"].includes(ext) &&
      f.size <= 650000
    ) {
      const source = await f.text();
      blocks = [
        {
          ...newBlock(
            ext === "md" || ext === "markdown"
              ? "markdown"
              : ext === "csv"
                ? "code"
                : "text",
          ),
          content:
            ext === "csv"
              ? {
                  language: "plaintext",
                  code: source,
                  output: "",
                  explanation: "",
                }
              : { text: source },
        },
      ];
    }
    // Rehost exported resources so imported notes do not depend on the source account.
    for (const b of blocks) {
      const resources =
        b.type === "gallery"
          ? b.content.images || []
          : ["image", "file", "video"].includes(b.type)
            ? [b.content]
            : [];
      for (const c of resources) {
        if (typeof c.url === "string" && c.url.startsWith("data:")) {
          const match = c.url.match(/^data:([^;]+);base64,([a-zA-Z0-9+/=]+)$/);
          const suffix: Record<string, string> = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/gif": "gif",
            "image/webp": "webp",
            "application/pdf": "pdf",
            "application/json": "json",
            "text/plain": "txt",
            "text/csv": "csv",
            "application/zip": "zip",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              "docx",
            "application/vnd.ms-powerpoint": "ppt",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation":
              "pptx",
            "application/vnd.ms-excel": "xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              "xlsx",
          };
          if (!match || !suffix[match[1]])
            throw new Fault("JSON 笔记包含不支持的嵌入资源");
          const raw = atob(match[2]),
            bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0)),
            saved = await storeUpload(
              new File(
                [bytes],
                (c.name || "资源").replace(/\.[^.]+$/, "") +
                  "." +
                  suffix[match[1]],
                { type: match[1] },
              ),
              space,
              u.userId,
            );
          embedded.push(saved);
          c.id = saved.id;
          c.url = saved.url;
          c.mime = saved.mime;
        }
      }
    }
    tags = Array.from(new Set(tags));
    if (JSON.stringify(blocks).length > 700000 || blocks.length > 120)
      throw new Fault("文件正文过大，请拆分后导入");
    for (const segment of parts.slice(0, -1))
      parent = await folder(space, subject, parent, segment, u.userId);
    if (String(form.get("organize") || "auto") === "auto") {
      const category: Record<string, string> = {
        code: "code",
        document: "文档",
        image: "图片",
        notebook: "notebooks",
        note: "笔记",
        mindmap: "思维导图",
        other: "附件",
      };
      const n = category[fileType] || "附件",
        ancestors = parent
          ? await all(
              "WITH RECURSIVE ancestors(id,title,parent_id) AS (SELECT id,title,parent_id FROM pages WHERE id=? UNION SELECT p.id,p.title,p.parent_id FROM pages p JOIN ancestors a ON p.id=a.parent_id) SELECT title FROM ancestors",
              parent,
            )
          : [];
      const same: Record<string, string[]> = {
        code: ["code", "codes", "src", "代码"],
        document: ["docs", "documents", "document", "文档", "参考"],
        image: ["images", "image", "图片"],
        notebook: ["notebooks", "notebook"],
        note: ["notes", "笔记"],
      };
      if (
        !(same[fileType] || [n]).some((x) =>
          ancestors.some((a) => a.title.toLowerCase() === x),
        )
      )
        parent = await folder(space, subject, parent, n, u.userId);
    }
    const existing = await one(
      "SELECT id FROM pages WHERE space_id=? AND parent_id IS ? AND title=?",
      space,
      parent,
      title,
    );
    if (existing) {
      const dot = title.lastIndexOf("."),
        name = dot > 0 ? title.slice(0, dot) : title,
        suffix = dot > 0 ? title.slice(dot) : "";
      let k = 2;
      while (
        await one(
          "SELECT id FROM pages WHERE space_id=? AND parent_id IS ? AND title=?",
          space,
          parent,
          name + " (" + k + ")" + suffix,
        )
      )
        k++;
      title = name + " (" + k + ")" + suffix;
    }
    const attachedOnly = !blocks.length && !restoredNote && group !== "image";
    asset = await storeUpload(f, space, u.userId);
    if (group === "image")
      blocks = [
        {
          ...newBlock("image"),
          content: { id: asset.id, url: asset.url, name: f.name },
        },
      ];
    if (!blocks.length && !restoredNote)
      blocks = [
        {
          ...newBlock("file"),
          content: {
            id: asset.id,
            url: asset.url,
            name: f.name,
            mime: asset.mime,
          },
        },
      ];
    const id = uuid(),
      date = now(),
      sourcePath = safeImportPath(String(form.get("path") || f.name)).join("/");
    const statements = [
      stmt(
        "INSERT INTO pages(id,space_id,subject_id,parent_id,title,kind,created_by,updated_by,created_at,updated_at,summary,file_type,source_path,source_asset) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        space,
        subject,
        parent,
        title,
        group === "code" || group === "notebook" ? "代码案例" : "知识点",
        u.userId,
        u.userId,
        date,
        date,
        blocks
          .map((b) => JSON.stringify(b.content))
          .join("\n")
          .slice(0, 200000),
        fileType,
        sourcePath,
        asset.id,
      ),
      ...blocks.map((b, i) =>
        stmt(
          "INSERT INTO blocks(id,page_id,type,content,position,ai_generated,collapsed) VALUES(?,?,?,?,?,?,?)",
          b.id,
          id,
          b.type,
          JSON.stringify(b.content),
          i,
          b.aiGenerated ? 1 : 0,
          b.collapsed ? 1 : 0,
        ),
      ),
      stmt(
        "INSERT INTO revisions(id,page_id,version,snapshot,user_id,created_at) VALUES(?,?,?,?,?,?)",
        uuid(),
        id,
        1,
        JSON.stringify({ title, blocks, tags }),
        u.userId,
        date,
      ),
    ];
    for (const name of tags) {
      statements.push(
        stmt(
          "INSERT OR IGNORE INTO tags(id,space_id,name) VALUES(?,?,?)",
          uuid(),
          space,
          name,
        ),
      );
      statements.push(
        stmt(
          "INSERT INTO page_tags(page_id,tag_id) SELECT ?,id FROM tags WHERE space_id=? AND name=?",
          id,
          space,
          name,
        ),
      );
    }
    await db().batch(statements);
    return Response.json({
      id,
      title,
      parent,
      subject,
      fileType,
      sourcePath,
      assetId: asset.id,
      attachedOnly,
    });
  } catch (e: any) {
    for (const e of embedded) await discardUpload(e.id, e.key).catch(() => {});
    if (asset) await discardUpload(asset.id, asset.key).catch(() => {});
    console.error("import failed", e);
    return Response.json(
      {
        error:
          e instanceof Fault
            ? e.message
            : e.message === "文件路径不正确" ||
                e.message?.startsWith("目录层级")
              ? e.message
              : "导入失败，请重试；已成功的文件会保留",
      },
      { status: e.status || 400 },
    );
  }
}
