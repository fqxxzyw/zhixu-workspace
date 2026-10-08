"use client";
import { useRef, useState } from "react";
import { FolderUp, Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import { Modal, Btn, Choice } from "./ui";
import { Progress } from "@/components/ui/progress";
import { classifyFile, fileGroups } from "@/lib/files";
type Item = {
  file: File;
  path: string;
  status: "waiting" | "done" | "error";
  message?: string;
};
export function FileImport({
  open,
  onClose,
  space,
  subjects,
  pages,
  onDone,
}: any) {
  const [items, setItems] = useState<Item[]>([]),
    [subject, setSubject] = useState("auto"),
    [parent, setParent] = useState("none"),
    [organize, setOrganize] = useState("auto"),
    [busy, setBusy] = useState(false);
  const stop = useRef(false),
    input = useRef<HTMLInputElement>(null),
    directory = useRef<HTMLInputElement>(null);
  function select(files: FileList | null) {
    if (!files) return;
    const all = Array.from(files).filter(
      (f) =>
        !(f.webkitRelativePath || f.name)
          .split("/")
          .some(
            (p) =>
              p.startsWith(".") ||
              ["node_modules", "__pycache__", "venv"].includes(p),
          ),
    );
    if (
      all.length > 100 ||
      all.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
    ) {
      setItems([
        {
          file: all[0],
          path: "",
          status: "error",
          message: "每批最多 100 个文件、总大小 50 MB，请分批选择。",
        },
      ]);
      return;
    }
    setItems(
      all.map((file) => ({
        file,
        path: file.webkitRelativePath || file.name,
        status: "waiting",
      })),
    );
    if (input.current) input.current.value = "";
    if (directory.current) directory.current.value = "";
  }
  async function start() {
    setBusy(true);
    stop.current = false;
    let changed = false;
    try {
      for (let i = 0; i < items.length; i++) {
        if (stop.current) break;
        const item = items[i];
        if (item.status === "done" || !item.path) continue;
        try {
          const form = new FormData();
          form.set("space", space);
          form.set("file", item.file);
          form.set("path", item.path);
          form.set("organize", organize);
          if (subject !== "auto") form.set("subject", subject);
          if (parent !== "none") form.set("parent", parent);
          const r = await fetch("/api/import", { method: "POST", body: form });
          const value: any = await r.json();
          if (!r.ok) throw new Error(value.error);
          changed = true;
          setItems((v) =>
            v.map((x, k) =>
              k === i
                ? {
                    ...x,
                    status: "done",
                    message:
                      value.title +
                      (value.attachedOnly ? " · 原文件已保留，未转换正文" : ""),
                  }
                : x,
            ),
          );
        } catch (e: any) {
          setItems((v) =>
            v.map((x, k) =>
              k === i ? { ...x, status: "error", message: e.message } : x,
            ),
          );
        }
      }
    } finally {
      setBusy(false);
      if (changed) await onDone();
    }
  }
  const done = items.filter((x) => x.status === "done").length;
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="导入学习资料"
      description="保留原文件和目录层级。代码、Markdown 和 Notebook 单元格会转换为可编辑内容。"
      wide
    >
      <div className="form-stack">
        <div className="import-select">
          <Btn disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={16} />
            选择文件
          </Btn>
          <Btn disabled={busy} onClick={() => directory.current?.click()}>
            <FolderUp size={16} />
            选择文件夹
          </Btn>
          <input
            hidden
            multiple
            type="file"
            ref={input}
            onChange={(e) => select(e.target.files)}
          />
          <input
            hidden
            multiple
            type="file"
            ref={directory}
            {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={(e) => select(e.target.files)}
          />
          <span className="muted small">
            每个文件 ≤ 12 MB；隐藏文件和依赖目录会跳过。
          </span>
        </div>
        <div className="form-grid">
          <label>
            所属学科
            <Choice
              disabled={busy}
              value={subject}
              onChange={(v) => {
                setSubject(v);
                setParent("none");
              }}
              items={[
                { value: "auto", label: "从文件夹名称自动识别" },
                ...subjects.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
            />
          </label>
          <label>
            整理方式
            <Choice
              disabled={busy}
              value={organize}
              onChange={setOrganize}
              items={[
                { value: "auto", label: "保留目录 + 按文件类别整理" },
                { value: "original", label: "仅保留原始目录" },
              ]}
            />
          </label>
        </div>
        <label>
          目标目录
          <Choice
            disabled={busy}
            value={parent}
            onChange={setParent}
            items={[
              { value: "none", label: "学科根目录" },
              ...pages
                .filter(
                  (p: any) =>
                    p.kind === "文件夹" &&
                    (subject === "auto" || p.subject_id === subject),
                )
                .map((p: any) => ({
                  value: p.id,
                  label:
                    (subjects.find((s: any) => s.id === p.subject_id)?.name ||
                      "未分类") +
                    " / " +
                    folderPath(p, pages),
                })),
            ]}
          />
        </label>
        <p className="small muted">
          自动整理示例：PyTorch / 入门 / code / train.py，PyTorch / 入门 / 文档
          / 参考.md。Word、PDF、PPT 保留原文件；Notebook
          保留代码、已有文本与图片输出，执行仍需本地 Python 环境。
        </p>
        {items.length > 0 && (
          <>
            <div className="row between">
              <span>
                {done} / {items.length} 已导入
              </span>
              <span className="small muted">同名文件保留为副本</span>
            </div>
            <Progress value={(done / items.length) * 100} />
            <div className="import-list">
              {items.map((x, i) => (
                <div key={i} className={"import-item " + x.status}>
                  {x.status === "done" ? (
                    <Check size={15} />
                  ) : x.status === "error" ? (
                    <AlertCircle size={15} />
                  ) : busy ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <span className="status-dot" />
                  )}
                  <div>
                    <strong>{x.path || "请选择较小的批次"}</strong>
                    {x.message && <small>{x.message}</small>}
                  </div>
                  <span>
                    {
                      fileGroups.find(
                        (g) => g.value === classifyFile(x.file.name),
                      )?.label
                    }
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="row between">
          <span className="small muted">JSON 笔记可以重新导入恢复内容。</span>
          {busy ? (
            <Btn
              onClick={() => {
                stop.current = true;
              }}
            >
              当前文件完成后暂停
            </Btn>
          ) : (
            <Btn
              primary
              disabled={!items.some((x) => x.path && x.status !== "done")}
              onClick={() => void start()}
            >
              {items.some((x) => x.status === "error")
                ? "重试未完成文件"
                : "开始导入"}
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  );
}
export function folderPath(p: any, pages: any[]) {
  const parts = [p.title],
    seen = new Set([p.id]);
  while (p.parent_id) {
    p = pages.find((x) => x.id === p.parent_id);
    if (!p || seen.has(p.id)) break;
    seen.add(p.id);
    parts.unshift(p.title);
  }
  return parts.join(" / ");
}
