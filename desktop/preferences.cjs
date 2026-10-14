const fs = require("node:fs/promises");
const path = require("node:path");
const defaults = { theme: "system", reduce: false, systemAccent: true };
function normalize(value = {}) {
  return {
    theme: ["system", "light", "dark"].includes(value?.theme)
      ? value.theme
      : defaults.theme,
    reduce: value?.reduce === true,
    systemAccent: value?.systemAccent !== false,
  };
}
// A random localhost port gives each launch a different localStorage origin.
// Keep only appearance preferences here; credentials remain in safeStorage.
async function createPreferences(dataDir) {
  const filename = path.join(dataDir, "appearance.json");
  let value = { ...defaults },
    queue = Promise.resolve();
  try {
    value = normalize(JSON.parse(await fs.readFile(filename, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  return {
    get: () => ({ ...value }),
    save(next) {
      value = normalize(next);
      const contents = JSON.stringify(value);
      queue = queue
        .catch(() => {})
        .then(async () => {
          await fs.mkdir(dataDir, { recursive: true });
          await fs.writeFile(filename + ".tmp", contents, { mode: 0o600 });
          await fs.rename(filename + ".tmp", filename);
        });
      return queue;
    },
    flush: () => queue,
  };
}
module.exports = { createPreferences };
