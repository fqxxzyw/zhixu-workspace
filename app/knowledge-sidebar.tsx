"use client";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PanelLeft,
  ChevronRight,
  Folder,
  FileText,
  Code2,
  Image,
  Network,
  Home,
  BookOpen,
  Clock,
  Search,
  Upload,
  Plus,
  Settings,
} from "lucide-react";
import { Choice } from "./ui";
import { fileGroups, inferPageGroup } from "@/lib/files";
export function KnowledgeSidebar({
  open,
  toggle,
  pages,
  subjects,
  active,
  space,
  view,
  onView,
  onPage,
  onSubject,
  onCreate,
  onImport,
  onSearch,
  onSettings,
  canEdit,
}: any) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [mode, setMode] = useState("subject");
  useEffect(() => {
    try {
      setExpanded(
        JSON.parse(localStorage.getItem("zhixu-tree-" + space) || "{}"),
      );
    } catch {}
  }, [space]);
  function expand(id: string, v: boolean) {
    setExpanded((old) => {
      const next = { ...old, [id]: v };
      localStorage.setItem("zhixu-tree-" + space, JSON.stringify(next));
      return next;
    });
  }
  useEffect(() => {
    if (!active) return;
    const ancestors = new Set<string>();
    let p = pages.find((p: any) => p.id === active);
    while (p?.parent_id && !ancestors.has(p.parent_id)) {
      ancestors.add(p.parent_id);
      p = pages.find((x: any) => x.id === p.parent_id);
    }
    if (ancestors.size)
      setExpanded((v) => ({
        ...v,
        ...Object.fromEntries([...ancestors].map((id) => [id, true])),
      }));
  }, [active, pages]);
  const icon = (p: any) =>
    inferPageGroup(p) === "folder"
      ? Folder
      : ["code", "notebook"].includes(inferPageGroup(p))
        ? Code2
        : inferPageGroup(p) === "image"
          ? Image
          : inferPageGroup(p) === "mindmap"
            ? Network
            : FileText;
  function tree(list: any[], depth = 0, seen = new Set<string>()) {
    return list.map((p) => {
      if (seen.has(p.id) || depth > 24) return null;
      const next = new Set(seen);
      next.add(p.id);
      const children = pages.filter((x: any) => x.parent_id === p.id),
        Icon = icon(p);
      return (
        <Collapsible
          key={p.id}
          open={expanded[p.id] ?? false}
          onOpenChange={(v) => expand(p.id, v)}
        >
          <div
            className={"file-tree-row " + (active === p.id ? "active" : "")}
            style={{ paddingLeft: depth * 14 + 8 }}
          >
            {children.length || p.kind === "文件夹" ? (
              <CollapsibleTrigger
                className="tree-caret"
                aria-label={(expanded[p.id] ? "收起 " : "展开 ") + p.title}
              >
                <ChevronRight size={13} />
              </CollapsibleTrigger>
            ) : (
              <span className="tree-caret" />
            )}
            <button
              onClick={() => onPage(p.id)}
              title={p.source_path || p.title}
            >
              <Icon size={15} />
              <span>{p.title}</span>
            </button>
          </div>
          <CollapsibleContent>
            {tree(children, depth + 1, next)}
          </CollapsibleContent>
        </Collapsible>
      );
    });
  }
  return (
    <Sidebar
      collapsible="none"
      className={"knowledge-sidebar " + (open ? "expanded" : "compact")}
    >
      <SidebarHeader className="sidebar-head">
        <button
          className="sidebar-toggle"
          title={open ? "收起目录 · Ctrl+B" : "展开目录 · Ctrl+B"}
          aria-label={open ? "收起目录" : "展开目录"}
          onClick={toggle}
        >
          <PanelLeft size={20} />
        </button>
        {open && (
          <span>
            知序 <small>知识目录</small>
          </span>
        )}
      </SidebarHeader>
      <SidebarContent className="sidebar-scroll">
        <div className="sidebar-nav">
          {[
            ["dashboard", "学习台", Home],
            ["library", "知识库", BookOpen],
            ["review", "今日复习", Clock],
            ["playground", "实验室", Code2],
          ].map(([key, label, Icon]: any) => (
            <button
              key={key}
              title={label}
              className={view === key ? "active" : ""}
              onClick={() => onView(key)}
            >
              <Icon size={18} />
              {open && <span>{label}</span>}
            </button>
          ))}
          <button title="全局搜索 · Ctrl+K" onClick={onSearch}>
            <Search size={18} />
            {open && <span>搜索知识</span>}
          </button>
        </div>
        {open && (
          <>
            <div className="tree-heading">
              <Choice
                label="目录分组"
                value={mode}
                items={[
                  { value: "subject", label: "按学科" },
                  { value: "type", label: "按文件类别" },
                ]}
                onChange={setMode}
              />
              <button title="新建页面" disabled={!canEdit} onClick={onCreate}>
                <Plus size={16} />
              </button>
            </div>
            {mode === "subject"
              ? [...subjects, { id: "none", name: "未分类" }].map((s) => {
                  const list = pages.filter(
                    (p: any) =>
                      (p.subject_id || "none") === s.id &&
                      (!p.parent_id ||
                        !pages.some((x: any) => x.id === p.parent_id)),
                  );
                  return (
                    <Collapsible
                      key={s.id}
                      open={expanded["s-" + s.id] ?? true}
                      onOpenChange={(v) => expand("s-" + s.id, v)}
                    >
                      <div className="tree-subject">
                        <CollapsibleTrigger
                          className="tree-caret"
                          aria-label={"展开学科 " + s.name}
                        >
                          <ChevronRight size={13} />
                        </CollapsibleTrigger>
                        <button onClick={() => onSubject(s.id)}>
                          <span>{s.name}</span>
                          <small>
                            {
                              pages.filter(
                                (p: any) =>
                                  (p.subject_id || "none") === s.id &&
                                  p.kind !== "文件夹",
                              ).length
                            }
                          </small>
                        </button>
                      </div>
                      <CollapsibleContent>{tree(list)}</CollapsibleContent>
                    </Collapsible>
                  );
                })
              : fileGroups
                  .filter((g) => g.value !== "folder")
                  .map((g) => {
                    const list = pages.filter(
                      (p: any) => inferPageGroup(p) === g.value,
                    );
                    return (
                      <Collapsible key={g.value} defaultOpen={true}>
                        <CollapsibleTrigger className="tree-type">
                          <ChevronRight size={13} />
                          {g.label}
                          <small>{list.length}</small>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {list.map((p: any) => {
                            const Icon = icon(p);
                            return (
                              <div
                                className={
                                  "file-tree-row type-row " +
                                  (active === p.id ? "active" : "")
                                }
                                key={p.id}
                              >
                                <button
                                  title={p.source_path || p.title}
                                  onClick={() => onPage(p.id)}
                                >
                                  <Icon size={15} />
                                  <span>
                                    {p.title}
                                    <small>
                                      {p.source_path ||
                                        subjects.find(
                                          (s: any) => s.id === p.subject_id,
                                        )?.name ||
                                        "未分类"}
                                    </small>
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
            <div className="sidebar-tip">
              点击箭头展开层级，点击名称打开内容。
            </div>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="sidebar-footer">
        <button title="导入文件或文件夹" disabled={!canEdit} onClick={onImport}>
          <Upload size={18} />
          {open && <span>导入文件 / 文件夹</span>}
        </button>
        <button title="设置" onClick={onSettings}>
          <Settings size={18} />
          {open && <span>设置</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
