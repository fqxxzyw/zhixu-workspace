// Run after `npm --prefix desktop run build`. Uses an isolated local service and data.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { startService } from "../desktop/out/service.mjs";
const root = path.resolve(import.meta.dirname, "..");
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "zhixu-ui-"));
const output = path.join(root, "outputs/fluent");
await fs.mkdir(output, { recursive: true });
const service = await startService({
  dataDir: path.join(temp, "data"),
  secret: randomBytes(32).toString("hex"),
  migrations: path.join(root, "desktop/out/migrations"),
  renderer: path.join(root, "desktop/out/renderer"),
});
async function capture(page, options) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot(options);
}
let browser;
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1380, height: 900 },
  });
  // Only native IPC is substituted. Authentication, SQLite, APIs and renderer are real.
  await context.addInitScript(() => {
    window.zhixuDesktop = {
      getAppearance: async () => ({
        accent: "0078d4",
        material: false,
        titlebar: true,
      }),
      setTheme: async () => {},
      onAppearanceChanged: () => () => {},
      showDataDirectory: async () => {},
      showFile: async () => true,
      chooseDirectory: async () => null,
    };
  });
  const indexDir = path.join(temp, "课程材料");
  await fs.mkdir(indexDir);
  await Promise.all(
    Array.from({ length: 230 }, (_, i) =>
      fs.writeFile(
        path.join(
          indexDir,
          `lesson-${String(i).padStart(3, "0")}-` +
            "很长的文件名称".repeat(5) +
            ".txt",
        ),
        "LongUnbrokenToken_".repeat(200),
      ),
    ),
  );
  await context.exposeBinding("chooseTestDirectory", () => ({
    grant: service.indexer.grantRootPath(indexDir),
    path: indexDir,
  }));
  await context.addInitScript(() => {
    window.zhixuDesktop.chooseDirectory = () => window.chooseTestDirectory();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(service.origin);
  await page.getByLabel("账户名", { exact: true }).fill("界面验证");
  await page.getByLabel("密码", { exact: true }).fill("ui-test-password-123");
  await page
    .getByLabel("确认密码", { exact: true })
    .fill("ui-test-password-123");
  await page.getByRole("button", { name: "创建本地账户", exact: true }).click();
  await page.getByRole("button", { name: "跳过引导", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "今天想学什么？" }),
  ).toBeVisible();
  await capture(page, {
    path: path.join(output, "01-empty-light.png"),
    fullPage: true,
  });
  await page
    .locator(".sidebar-footer")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await page.getByRole("combobox", { name: "应用主题" }).click();
  await page.getByRole("option", { name: "深色", exact: true }).click();
  await capture(page, {
    path: path.join(output, "00-settings-clean-dark.png"),
    fullPage: true,
  });
  await page.getByRole("combobox", { name: "应用主题" }).click();
  await page.getByRole("option", { name: "浅色", exact: true }).click();
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async () => {
    async function api(action, data = {}, method = "POST") {
      const r = await fetch(
        method === "GET"
          ? "/api/workspace?" + new URLSearchParams({ action, ...data })
          : "/api/workspace",
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(method === "POST"
            ? { body: JSON.stringify({ action, ...data }) }
            : {}),
        },
      );
      const result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));
      return result;
    }
    const boot = await api("bootstrap", {}, "GET");
    const space = boot.space;
    const subject = await api("subject", {
      space,
      name: "计算机基础与非常长的学科名称".repeat(4),
    });
    const a = await api("create", {
      space,
      subject: subject.id,
      title: "长标题 · " + "Windows11_Fluent_Design_".repeat(8),
      blockType: "text",
    });
    await api("save", {
      id: a.id,
      title: "长标题 · " + "Windows11_Fluent_Design_".repeat(8),
      version: 1,
      tags: ["很长的标签".repeat(8)],
      blocks: [
        {
          id: "text",
          type: "text",
          content: {
            text: "连续长文本测试 " + "LongUnbrokenToken_".repeat(50),
          },
        },
        {
          id: "todo",
          type: "todo",
          content: { text: "可通过键盘勾选的复习事项", checked: false },
        },
        {
          id: "code",
          type: "code",
          content: {
            language: "javascript",
            code: 'console.log("Fluent UI");',
          },
        },
        {
          id: "html",
          type: "html",
          content: {
            html: "<h1>实验可运行</h1>",
            css: "body {font-family: sans-serif}",
            js: 'console.log("实验运行成功")',
          },
        },
      ],
    });
    const b = await api("create", {
      space,
      title: "第二篇笔记",
      blockType: "text",
    });
    await api("cards", {
      id: a.id,
      cards: [{ front: "键盘可以翻面吗？", back: "可以，按 Enter 或空格。" }],
    });
    await api("onboarding", { step: -1 });
    return { a: a.id, b: b.id };
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "今天想学什么？" }),
  ).toBeVisible();
  await capture(page, {
    path: path.join(output, "02-dashboard-light.png"),
    fullPage: true,
  });
  async function noOverflow(label) {
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("main *,[role=dialog] *")]
        .filter((e) => {
          const r = e.getBoundingClientRect(),
            s = getComputedStyle(e);
          return (
            r.width > 0 &&
            r.right > innerWidth + 2 &&
            s.position !== "fixed" &&
            s.visibility !== "hidden"
          );
        })
        .slice(0, 12)
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          text: e.textContent?.slice(0, 40),
        })),
    }));
    assert(
      metrics.scroll <= metrics.width + 2,
      `${label}: ${JSON.stringify(metrics)}`,
    );
  }
  await noOverflow("dashboard");
  await page
    .locator(".sidebar-nav")
    .getByRole("button", { name: "知识库", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "我的知识库" })).toBeVisible();
  await noOverflow("library");
  await page.locator(".library-row").filter({ hasText: "长标题" }).click();
  await expect(page.getByRole("textbox", { name: "页面标题" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "页面标题" })).toHaveValue(
    /长标题/,
  );
  const titleFits = await page
    .getByRole("textbox", { name: "页面标题" })
    .evaluate((e) => e.scrollHeight <= e.clientHeight + 2);
  assert(titleFits, "Note title must wrap without clipping");
  await noOverflow("editor");
  await page.getByRole("button", { name: "修改历史", exact: true }).click();
  await page.locator(".revision-row").first().click();
  await expect(page.locator(".revision-preview h2")).toBeVisible();
  for (const width of [1380, 760, 480, 360]) {
    await page.setViewportSize({ width, height: 800 });
    assert(
      await page
        .locator(".modal-body")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
      `History content overflow at ${width}`,
    );
    assert(
      await page
        .locator(".revision-preview")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
      `History text overflow at ${width}`,
    );
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1380, height: 900 });
  await capture(page, {
    path: path.join(output, "03-editor-light.png"),
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "页面标题" })
    .fill("修改后保留的完整笔记标题");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已保存", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".sidebar-nav")
    .getByRole("button", { name: "今日复习", exact: true })
    .click();
  const card = page.locator(".flashcard");
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toContainText("可以，按 Enter 或空格");
  await page.getByRole("button", { name: "认识", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "待复习卡片已完成" }),
  ).toBeVisible();
  await page
    .locator(".sidebar-nav")
    .getByRole("button", { name: "实验室", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "HTML 实验室" }),
  ).toBeVisible();
  await capture(page, {
    path: path.join(output, "04-playground.png"),
    fullPage: true,
  });
  await noOverflow("playground");
  await page
    .locator(".sidebar-footer")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await page.getByRole("tab", { name: "偏好设置", exact: true }).click();
  await page.getByRole("combobox", { name: "应用主题" }).click();
  await page.getByRole("option", { name: "深色", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("switch", { name: "减少动态效果" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce", "true");
  for (const track of await page.locator("[data-slot=switch]").all()) {
    const bounds = await track.boundingBox(),
      thumb = await track.locator("[data-slot=switch-thumb]").boundingBox();
    assert(
      thumb.x >= bounds.x && thumb.x + thumb.width <= bounds.x + bounds.width,
      "Switch thumb stays inside its track",
    );
  }
  await capture(page, {
    path: path.join(output, "05-settings-dark.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator('.sidebar-footer button[title="设置"]'),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-reduce", "true");
  await page.getByRole("button", { name: "本地文件索引", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "整理视图，保留原文件。" }),
  ).toBeVisible();
  await capture(page, {
    path: path.join(output, "06-files-dark.png"),
    fullPage: true,
  });
  await noOverflow("file index");
  await page.getByRole("button", { name: "选择文件夹", exact: true }).click();
  await expect(page.locator(".index-status")).toContainText("230 个文件", {
    timeout: 15000,
  });
  await expect(page.locator(".index-file-row")).toHaveCount(100);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".index-pagination")).toContainText("第 2 / 3 页");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".index-file-row")).toHaveCount(30);
  await page.locator(".index-file-row").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("textbox", { name: "学科 / 专题", exact: true })
    .fill("机器学习");
  await page.getByRole("button", { name: "保存分类", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "搜索本地索引", exact: true })
    .fill("机器学习");
  await expect(page.locator(".index-file-row")).toHaveCount(1);
  await page.setViewportSize({ width: 760, height: 650 });
  await noOverflow("file results narrow");
  await page.locator(".index-file-row").first().click();
  await expect(page.locator(".file-preview .code-view")).toBeVisible();
  assert(
    await page
      .locator(".modal-body")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
    "File preview must scroll locally",
  );
  await capture(page, {
    path: path.join(output, "09-file-preview.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1380, height: 900 });
  await page.getByRole("button", { name: "学习工作台", exact: true }).click();
  // A delayed response may never override the last selected note.
  await page.route("**/api/workspace?**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.get("action") === "page" &&
      url.searchParams.get("id") === ids.a
    )
      await new Promise((r) => setTimeout(r, 300));
    await route.continue();
  });
  await page
    .locator(".file-tree-row button")
    .filter({ hasText: "修改后保留" })
    .click();
  await page
    .locator(".file-tree-row button")
    .filter({ hasText: "第二篇笔记" })
    .click();
  await expect(page.getByRole("textbox", { name: "页面标题" })).toHaveValue(
    "第二篇笔记",
  );
  await page.waitForTimeout(400);
  await expect(page.getByRole("textbox", { name: "页面标题" })).toHaveValue(
    "第二篇笔记",
  );
  await page.unroute("**/api/workspace?**");
  // Device scale factors plus logical viewport model Windows display scaling.
  const storageState = await context.storageState();
  for (const scale of [1, 1.25, 1.5, 2]) {
    const c = await browser.newContext({
      storageState,
      deviceScaleFactor: scale,
      viewport: {
        width: Math.round(1380 / scale),
        height: Math.round(900 / scale),
      },
    });
    const p = await c.newPage();
    await p.goto(service.origin);
    await expect(
      p.getByRole("heading", { name: "今天想学什么？" }),
    ).toBeVisible();
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
      `Overflow at ${scale * 100}%`,
    );
    await p
      .locator(".sidebar-footer")
      .getByRole("button", { name: "设置", exact: true })
      .click();
    await p.getByRole("tab", { name: "偏好设置", exact: true }).click();
    const box = await p.getByRole("dialog").boundingBox();
    assert(
      box.x >= 0 && box.x + box.width <= Math.round(1380 / scale) + 1,
      `Dialog outside ${scale * 100}% viewport`,
    );
    await capture(p, {
      path: path.join(output, `07-scale-${scale * 100}.png`),
      fullPage: true,
    });
    await c.close();
  }
  for (const width of [760, 650, 480, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page
      .locator(".sidebar-nav")
      .getByRole("button", { name: "学习台", exact: true })
      .click();
    await noOverflow(`dashboard ${width}`);
    if (width <= 650) {
      const navBox = await page
        .locator(".knowledge-sidebar.expanded")
        .boundingBox();
      assert(
        navBox.height <= 360,
        "Narrow navigation must leave room for content",
      );
    }
    await page
      .locator(".sidebar-nav")
      .getByRole("button", { name: "知识库", exact: true })
      .click();
    await noOverflow(`library ${width}`);
    await page
      .locator(".library-row")
      .filter({ hasText: "修改后保留" })
      .click();
    await expect(page.getByRole("textbox", { name: "页面标题" })).toBeVisible();
    await noOverflow(`editor ${width}`);
  }
  await capture(page, {
    path: path.join(output, "08-narrow-editor.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, [], "No unhandled renderer errors");
  console.log(
    "PASS: login, long content, all primary views, edit/save, keyboard review, settings focus, dark theme persistence, reduced motion, file index, stale-request protection, 100/125/150/200% scale layouts and 360–1380px viewport overflow checks.",
  );
  console.log("Screenshots: outputs/fluent/");
} finally {
  await browser?.close();
  await service.close();
  await fs.rm(temp, { recursive: true, force: true });
}
