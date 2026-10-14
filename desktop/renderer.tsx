import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Folder,
  FolderOpen,
  Search,
  RefreshCw,
  FileText,
  LogOut,
  HardDrive,
  BookOpen,
  Loader2,
  Plus,
  ChevronRight,
  ChevronDown,
} from "@/components/fluent-icons";
import { fileRows } from "./file-rows";
import Workspace from "../app/workspace";
import { Btn, Choice, Modal, api } from "../app/ui";
import { Markdown, Highlight } from "../app/rich";
import { fileGroups, fileLanguage } from "../lib/files";
import "../app/globals.css";
import "../app/fluent.css";
import "./desktop.css";
import {
  AppearanceProvider,
  useAppearance,
  useFluentView,
} from "../app/appearance";
async function local(url: string, data?: any): Promise<any> {
  const r = await fetch(
    "/local/" + url,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {},
  );
  const v: any = await r.json();
  if (!r.ok) throw new Error(v.error || "本地操作失败");
  return v;
}
function DesktopShell() {
  const { native } = useAppearance();
  return (
    <>
      {native.titlebar && (
        <div className="window-caption">
          <span className="caption-icon">Z</span>
          <span>知序 · 本地学习工作台</span>
        </div>
      )}
      <App />
    </>
  );
}
function App() {
  const [status, setStatus] = useState<any>(null),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useFluentView("workspace");
  const boot = () =>
    local("auth/status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void boot();
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (status.setupRequired && password !== confirmation) {
      setError("两次密码不一致");
      return;
    }
    setBusy(true);
    try {
      const r = await local(
        "auth/" + (status.setupRequired ? "setup" : "login"),
        { username, password },
      );
      setStatus({ setupRequired: false, user: r.user });
      setPassword("");
      setConfirmation("");
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!status)
    return (
      <div className="local-login">
        <Loader2 className="spin" />
        <p>{error || "正在打开本地知识库…"}</p>
      </div>
    );
  if (!status.user)
    return (
      <div className="local-login">
        <div className="local-login-card">
          <span className="brand-mark">Z</span>
          <span className="eyebrow">知序 · 本地学习工作台</span>
          <h1>{status.setupRequired ? "设置你的本地账户" : "欢迎回来"}</h1>
          <p>账户与笔记保存在这台电脑，无需联网登录。</p>
          <form className="form-stack" onSubmit={login}>
            <label>
              账户名
              <input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={40}
              />
            </label>
            <label>
              密码
              <input
                type="password"
                autoComplete={
                  status.setupRequired ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </label>
            {status.setupRequired && (
              <label>
                确认密码
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Btn primary type="submit" disabled={busy}>
              {busy
                ? "正在处理…"
                : status.setupRequired
                  ? "创建本地账户"
                  : "登录"}
            </Btn>
          </form>
          <span className="small muted">
            请妥善保管密码。当前预览版没有云端密码找回。
          </span>
        </div>
      </div>
    );
  return (
    <>
      <div className="desktop-bar">
        <div className="row">
          <span className="local-badge">
            <HardDrive size={14} />
            本地版
          </span>
          <button
            className={view === "workspace" ? "selected" : ""}
            onClick={() => setView("workspace")}
          >
            <BookOpen size={15} />
            学习工作台
          </button>
          <button
            className={view === "files" ? "selected" : ""}
            onClick={() => setView("files")}
          >
            <FolderOpen size={15} />
            本地文件索引
          </button>
        </div>
        <div className="row desktop-account">
          <span className="small muted" title={status.user.fullName}>
            {status.user.fullName}
          </span>
          <button
            title="打开应用数据目录"
            onClick={() =>
              void window
                .zhixuDesktop!.showDataDirectory()
                .catch((e) => setError(e.message))
            }
          >
            <HardDrive size={15} />
          </button>
          <button
            title="退出本地账户"
            onClick={() => {
              if (
                document.documentElement.dataset.unsaved === "true" &&
                !window.confirm("当前笔记有未保存的修改。确定退出并放弃修改？")
              )
                return;
              void local("auth/logout", {}).then(() => {
                setStatus({ ...status, user: null });
                setView("workspace");
              });
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
      <div style={{ display: view === "workspace" ? "block" : "none" }}>
        <Workspace key={status.user.userId} user={status.user} desktop />
      </div>
      {view === "files" && <FileIndex />}
    </>
  );
}
function FileIndex() {
  const fileRequest = useRef(0),
    previewRequest = useRef(0);
  const [roots, setRoots] = useState<any[]>([]),
    [root, setRoot] = useState(""),
    [files, setFiles] = useState<any[]>([]),
    [total, setTotal] = useState(0),
    [loadingFiles, setLoadingFiles] = useState(false),
    [pageNumber, setPageNumber] = useState(0),
    [mode, setMode] = useState("directory"),
    [space, setSpace] = useState(""),
    [spaces, setSpaces] = useState<any[]>([]),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<any>(null),
    [preview, setPreview] = useState<any>(null),
    [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [subject, setSubject] = useState(""),
    [tags, setTags] = useState(""),
    [folder, setFolder] = useState("");
  async function loadRoots() {
    const rs = await local("index/roots");
    setRoots(rs);
    if (!root && rs[0]) setRoot(rs[0].id);
  }
  async function loadFiles() {
    const request = ++fileRequest.current;
    if (!root) {
      setFiles([]);
      setTotal(0);
      return;
    }
    try {
      const r = await local("index/files?" + new URLSearchParams({ root, q }));
      if (request !== fileRequest.current) return;
      setFiles(r.files);
      setTotal(r.total);
      setError("");
    } catch (e: any) {
      if (request === fileRequest.current) setError(e.message);
    } finally {
      if (request === fileRequest.current) setLoadingFiles(false);
    }
  }
  useEffect(() => {
    void api("bootstrap", {}, "GET")
      .then((d) => {
        setSpace(d.space);
        setSpaces(d.spaces);
      })
      .catch((e) => setError(e.message));
    void loadRoots().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setFiles([]);
    setLoadingFiles(!!root);
    const timer = setTimeout(
      () => void loadFiles().catch((e) => setError(e.message)),
      180,
    );
    return () => {
      clearTimeout(timer);
      fileRequest.current++;
    };
  }, [root, q]);
  useEffect(() => {
    if (!roots.some((r) => r.status === "scanning")) return;
    const timer = setInterval(() => {
      void loadRoots().catch((e) => setError(e.message));
      void loadFiles().catch((e) => setError(e.message));
    }, 900);
    return () => clearInterval(timer);
  }, [roots, root, q]);
  async function choose() {
    setBusy(true);
    setError("");
    try {
      const selection = await window.zhixuDesktop!.chooseDirectory();
      if (selection) {
        const r = await local("index/start", { grant: selection.grant, space });
        setRoot(r.id);
        await loadRoots();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function open(f: any) {
    const request = ++previewRequest.current;
    setSelected(f);
    setSubject(f.subject);
    setTags(JSON.parse(f.tags || "[]").join(", "));
    setFolder(f.virtual_folder);
    setPreview(null);
    try {
      if (f.file_type === "image") setPreview({ image: true });
      else {
        const content = await local("index/content?id=" + f.id);
        if (request === previewRequest.current) setPreview(content);
      }
    } catch (e: any) {
      if (request === previewRequest.current) setPreview({ error: e.message });
    }
  }
  function fileRow(f: any, depth = 0) {
    return (
      <button
        key={f.id}
        className={
          "index-file-row " + (f.status === "missing" ? "missing" : "")
        }
        onClick={() => void open(f)}
        style={{ paddingLeft: Math.min(depth, 6) * 14 + 18 }}
        title={f.relative_path}
      >
        <FileText size={15} />
        <div>
          <strong>{f.name}</strong>
          <small>
            {f.subject || f.relative_path}
            {f.virtual_folder ? " · " + f.virtual_folder : ""}
          </small>
        </div>
        <span>
          {f.status === "missing"
            ? "原文件不可用"
            : fileGroups.find((g) => g.value === f.file_type)?.label || "文件"}
        </span>
      </button>
    );
  }
  const current = roots.find((r) => r.id === root);
  const visibleRows = useMemo(
    () => fileRows(files, expanded, mode, q, fileGroups),
    [files, expanded, mode, q],
  );
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / 100));
  const currentPage = Math.min(pageNumber, pageCount - 1);
  useEffect(() => setPageNumber(0), [root, q, mode]);
  return (
    <main className="local-index">
      <div className="page-heading">
        <div>
          <span className="eyebrow">本地文件索引</span>
          <h1>整理视图，保留原文件。</h1>
          <p>选择目录后只建立索引。分类、标签和笔记不移动或重命名原文件。</p>
        </div>
        <Btn primary disabled={busy || !space} onClick={() => void choose()}>
          <Plus size={16} />
          选择文件夹
        </Btn>
      </div>
      <div className="index-controls">
        <Choice
          label="知识空间"
          value={space}
          items={spaces.map((s) => ({ value: s.id, label: s.name }))}
          onChange={setSpace}
        />
        <Choice
          label="索引目录"
          value={root || "none"}
          items={
            roots.length
              ? roots.map((r) => ({ value: r.id, label: r.name }))
              : [{ value: "none", label: "尚未选择目录" }]
          }
          onChange={setRoot}
        />
        <Choice
          label="查看方式"
          value={mode}
          items={[
            { value: "directory", label: "磁盘目录" },
            { value: "type", label: "文件类别" },
            { value: "subject", label: "学科 / 专题" },
            { value: "folder", label: "虚拟目录" },
          ]}
          onChange={setMode}
        />
        <div className="index-search">
          <Search size={15} />
          <input
            placeholder="搜索文件、路径、标签…"
            aria-label="搜索本地索引"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {current && (
        <div className="index-status">
          <span title={current.path}>{current.path}</span>
          <span>
            {current.status === "scanning"
              ? "正在扫描 · " + current.scanned_count + " 个文件"
              : current.status === "paused"
                ? "已暂停"
                : current.status === "error"
                  ? "扫描遇到问题"
                  : total + " 个文件"}
          </span>
          {current.status === "scanning" ? (
            <Btn
              onClick={() =>
                void local("index/cancel", { root })
                  .then(loadRoots)
                  .catch((e) => setError(e.message))
              }
            >
              暂停
            </Btn>
          ) : (
            <Btn
              onClick={() =>
                void local("index/refresh", { root })
                  .then(loadRoots)
                  .catch((e) => setError(e.message))
              }
            >
              <RefreshCw size={14} />
              刷新索引
            </Btn>
          )}
          {current.message && <small>{current.message}</small>}
        </div>
      )}
      {total > 5000 && (
        <p className="muted">
          当前显示最多 5,000 个文件，请选择较小的子目录建立索引。
        </p>
      )}
      <div className="index-list">
        {!root ? (
          <div className="empty-state">
            <FolderOpen size={36} />
            <h2>选择你正在学习的文件夹</h2>
            <p>例如 PyTorch 课程目录，文件会留在原来的位置。</p>
          </div>
        ) : loadingFiles && !files.length ? (
          <div className="empty-state" role="status">
            <Loader2 className="spin" />
            <p>正在读取文件列表…</p>
          </div>
        ) : !files.length ? (
          <div className="empty-state">
            <p>
              {current?.status === "scanning"
                ? "正在读取目录…"
                : "没有匹配的文件。"}
            </p>
          </div>
        ) : (
          visibleRows
            .slice(currentPage * 100, (currentPage + 1) * 100)
            .map((row) =>
              row.folder ? (
                <button
                  key={row.key}
                  className="index-tree-folder"
                  title={row.key}
                  aria-expanded={!!expanded[row.key]}
                  style={{ paddingLeft: Math.min(row.depth, 6) * 14 + 12 }}
                  onClick={() =>
                    setExpanded((v) => ({ ...v, [row.key]: !v[row.key] }))
                  }
                >
                  {expanded[row.key] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <Folder size={15} />
                  <span>{row.folder}</span>
                </button>
              ) : row.heading ? (
                <h3 key={row.key}>
                  {row.heading} <small>{row.count}</small>
                </h3>
              ) : (
                fileRow(row.file, row.depth)
              ),
            )
        )}
      </div>
      {pageCount > 1 && (
        <nav className="index-pagination" aria-label="文件列表分页">
          <Btn
            disabled={currentPage === 0}
            onClick={() => setPageNumber(currentPage - 1)}
          >
            上一页
          </Btn>
          <span role="status">
            第 {currentPage + 1} / {pageCount} 页 · {visibleRows.length} 项
          </span>
          <Btn
            disabled={currentPage === pageCount - 1}
            onClick={() => setPageNumber(currentPage + 1)}
          >
            下一页
          </Btn>
        </nav>
      )}
      <div className="index-feedback" role="status">
        {loadingFiles && (
          <>
            <Loader2 size={14} className="spin" />
            正在更新文件列表…
          </>
        )}
      </div>
      <Modal
        open={!!selected}
        onClose={() => {
          previewRequest.current++;
          setSelected(null);
          setPreview(null);
        }}
        title={selected?.name || "文件"}
        description="预览与分类不修改原文件。"
        wide
      >
        {selected && (
          <div className="form-stack">
            <p className="small muted">
              {current?.path} / {selected.relative_path}
            </p>
            <div className="file-preview">
              {!preview ? (
                <Loader2 className="spin" />
              ) : preview.image ? (
                <img
                  src={"/local/index/image?id=" + selected.id}
                  alt={selected.name}
                />
              ) : preview.error ? (
                <p className="muted">{preview.error}</p>
              ) : selected.name.toLowerCase().endsWith(".md") ? (
                <Markdown text={preview.text} />
              ) : (
                <Highlight
                  code={preview.text}
                  language={fileLanguage(selected.name)}
                />
              )}
            </div>
            <div className="form-grid">
              <label>
                学科 / 专题
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例如：PyTorch"
                />
              </label>
              <label>
                虚拟目录
                <input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="例如：代码 / 优化器"
                />
              </label>
            </div>
            <label>
              标签（逗号分隔）
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="重点, 待复习"
              />
            </label>
            <div className="row wrap">
              <Btn
                primary
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void local("index/classify", {
                    root,
                    id: selected.id,
                    subject,
                    folder,
                    tags: tags
                      .split(/[,，]/)
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                    .then(() => {
                      setSelected(null);
                      return loadFiles();
                    })
                    .catch((e) => setPreview({ error: e.message }))
                    .finally(() => setBusy(false));
                }}
              >
                保存分类
              </Btn>
              <Btn
                onClick={() =>
                  void window
                    .zhixuDesktop!.showFile(selected.id)
                    .catch((e) => setPreview({ error: e.message }))
                }
              >
                <FolderOpen size={14} />
                定位原文件
              </Btn>
              <Btn
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void api("create", {
                    space: current.space_id,
                    title: selected.name + " · 学习笔记",
                    kind: "知识点",
                    blockType: "text",
                  })
                    .then(async (r) => {
                      await api("save", {
                        id: r.id,
                        title: selected.name + " · 学习笔记",
                        version: 1,
                        tags: tags
                          .split(/[,，]/)
                          .map((t) => t.trim())
                          .filter(Boolean),
                        blocks: [
                          {
                            id: crypto.randomUUID(),
                            type: "text",
                            content: {
                              text:
                                "原文件：" +
                                current.path +
                                " / " +
                                selected.relative_path +
                                "\n\n",
                            },
                          },
                        ],
                      });
                      window.dispatchEvent(new Event("zhixu-local-changed"));
                      setPreview({
                        error:
                          "学习笔记已创建，可回到工作台打开。原文件保持不变。",
                      });
                    })
                    .catch((e) => setPreview({ error: e.message }))
                    .finally(() => setBusy(false));
                }}
              >
                创建学习笔记
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <AppearanceProvider>
    <DesktopShell />
  </AppearanceProvider>,
);
