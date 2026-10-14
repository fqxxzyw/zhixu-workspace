import test from "node:test";
import assert from "node:assert/strict";
import { fileRows } from "../file-rows.ts";
test("directory expansion, flat search and grouping keep every file reachable", () => {
  const files = Array.from({ length: 5000 }, (_, i) => ({
    id: String(i),
    relative_path: `lesson\\part-${i % 5}\\file-${i}.py`,
    file_type: "code",
    subject: i % 2 ? "PyTorch" : "",
    virtual_folder: "",
  }));
  assert.deepEqual(
    fileRows(files, {}, "directory", "", []).map((r) => r.key),
    ["lesson/"],
  );
  const expanded = {
    "lesson/": true,
    ...Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`lesson/part-${i}/`, true]),
    ),
  };
  const rows = fileRows(files, expanded, "directory", "", []);
  assert.equal(rows.length, 5006);
  assert.equal(
    new Set(rows.filter((r) => r.file).map((r) => r.file.id)).size,
    5000,
  );
  assert.equal(fileRows(files, {}, "directory", "file", []).length, 5000);
  const grouped = fileRows(files, {}, "subject", "", []);
  assert.equal(grouped.filter((r) => r.heading).length, 2);
  assert.equal(grouped.filter((r) => r.file).length, 5000);
});
