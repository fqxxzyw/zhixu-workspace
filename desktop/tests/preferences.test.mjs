import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPreferences } from "../preferences.cjs";
test("appearance survives new instances and rapid queued writes; corrupt data falls back", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zhixu-preferences-"));
  try {
    const store = await createPreferences(dir);
    assert.deepEqual(store.get(), {
      theme: "system",
      reduce: false,
      systemAccent: true,
    });
    await Promise.all([
      store.save({ theme: "light", reduce: false, systemAccent: true }),
      store.save({ theme: "dark", reduce: true, systemAccent: false }),
    ]);
    assert.deepEqual((await createPreferences(dir)).get(), {
      theme: "dark",
      reduce: true,
      systemAccent: false,
    });
    await fs.writeFile(path.join(dir, "appearance.json"), "{");
    assert.equal((await createPreferences(dir)).get().theme, "system");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
