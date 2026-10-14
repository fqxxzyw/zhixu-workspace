export type FileRow = {
  key: string;
  depth: number;
  folder?: string;
  file?: any;
  heading?: string;
  count?: number;
};
/** Build the directory once per result set, then flatten only expanded nodes. */
export function fileRows(
  files: any[],
  expanded: Record<string, boolean>,
  mode: string,
  query: string,
  groups: { value: string; label: string }[],
): FileRow[] {
  if (mode !== "directory") {
    const buckets = new Map<string, any[]>();
    for (const file of files) {
      const key =
        (mode === "type"
          ? file.file_type
          : mode === "folder"
            ? file.virtual_folder
            : file.subject) || "未归类";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(file);
    }
    return [...buckets].flatMap(([key, items]) => [
      {
        key: "group:" + key,
        depth: 0,
        heading:
          mode === "type"
            ? groups.find((g) => g.value === key)?.label || key
            : key,
        count: items.length,
      },
      ...items.map((file) => ({ key: file.id, depth: 0, file })),
    ]);
  }
  if (query) return files.map((file) => ({ key: file.id, depth: 0, file }));
  type Directory = { children: Map<string, Directory>; files: any[] };
  const root: Directory = { children: new Map(), files: [] };
  for (const file of files) {
    const parts = file.relative_path.replaceAll("\\", "/").split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.children.has(part))
        node.children.set(part, { children: new Map(), files: [] });
      node = node.children.get(part)!;
    }
    node.files.push(file);
  }
  const rows: FileRow[] = [];
  const walk = (node: Directory, prefix = "", depth = 0) => {
    for (const [name, child] of [...node.children].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const key = prefix + name + "/";
      rows.push({ key, depth, folder: name });
      if (expanded[key]) walk(child, key, depth + 1);
    }
    rows.push(...node.files.map((file) => ({ key: file.id, depth, file })));
  };
  walk(root);
  return rows;
}
