import { waitForUiState401 } from "./composables.js";
import {
  waitForWebflowResponse,
  waitForWebflowPageChange,
} from "./composables.js";
import { waitForWebflowTranslation } from "./composables.js";
import chalk from "chalk";

const pagesButtonSelector = '[data-panel-trigger-button-id="pages-button"]';
const navigatorButtonSelector =
  '[data-panel-trigger-button-id="navigator-button"]';
let pageIndexMap = {};
let browserTab;

/**
 * Opens the Pages sidebar if not already opened
 */
const openPagesButton = async () => {
  if (await isPagesOpened()) return;
  const pagesButton = await browserTab.waitForSelector(pagesButtonSelector, {
    visible: true,
  });
  await Promise.all([pagesButton.click(), waitForWebflowResponse(browserTab)]);
};

/**
 * Delay
 */
const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Opens the Navigator panel
 */
const openNavigatorButton = async () => {
  if (await isNavigatorOpened()) return true;

  const navigatorButton = await browserTab.waitForSelector(
    navigatorButtonSelector,
    {
      visible: true,
      timeout: 10000,
    },
  );

  const maxTries = 3;
  for (let i = 0; i < maxTries; i++) {
    await navigatorButton.click();
    await delay(300);

    if (await isNavigatorOpened()) return true;
  }

  return false;
};

const isPagesOpened = async () => {
  return await browserTab.$eval(
    pagesButtonSelector,
    (el) => el.getAttribute("aria-selected") === "true",
  );
};

const isNavigatorOpened = async () => {
  return await browserTab.$eval(
    navigatorButtonSelector,
    (el) => el.getAttribute("aria-selected") === "true",
  );
};

/**
 * Opens a page by index
 */
const openPageByIndex = async (index) => {
  await openPagesButton();
  const sidebar = await browserTab.waitForSelector(
    '[data-automation-id="left-sidebar-pages-list"]',
    { visible: true },
  );
  const elements = await sidebar.$$(
    '[data-automation-id="page-list-row-wrapper"]',
  );
  const pageEl = elements[index];
  if (!pageEl) return null;

  const shouldClick = index !== 1 || browserTab.url().includes("pageId=");

  if (shouldClick) {
    await pageEl.click();
    await waitForWebflowPageChange(browserTab);
  }

  return pageEl;
};

/**
 * Returns first TreeNode
 */
const getFirstTreeNode = async () => {
  await openNavigatorButton();

  try {
    const treeContainer = await browserTab.waitForSelector(
      '[data-automation-id="tree-view-container"]',
      { timeout: 10000 },
    );

    const treeNodesRoot = await treeContainer.waitForSelector(
      '[data-palette="TreeNodes_"]',
      { timeout: 10000 },
    );
    const nodes = await treeNodesRoot.$$(":scope > *");
    return nodes.length ? nodes[0] : null;
  } catch {
    return null;
  }
};

/**
 * Translates Homepage
 */
const translatePage = async (treeNode) => {
  await treeNode.click({ button: "right" });
  const translateButton = await browserTab.waitForSelector(
    '[data-automation-id="context-menu-translate-node"]',
    { visible: true },
  );
  await translateButton.click();
  await waitForWebflowTranslation(browserTab);
};

/**
 * Sets the Puppeteer page instance for the admin interface
 * @param {import('puppeteer-core').Page} page
 */
export const setBrowserTab = (page) => {
  browserTab = page;
};

/**
 * Builds a map of pages/folders
 */
export const openFoldersAndBuildPagesMap = async () => {
  await openPagesButton();

  const sidebar = await browserTab.waitForSelector(
    '[data-automation-id="left-sidebar-pages-list"]',
    { visible: true },
  );

  const elements = await sidebar.$$(
    '[data-automation-id="page-list-row-wrapper"]',
  );

  let firstSectionIndex = null;
  let secondSectionIndex = null;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    const sectionBody = await el.$(
      '[data-automation-id="page-tree-list-section-body"]',
    );

    if (sectionBody) {
      if (firstSectionIndex === null) {
        firstSectionIndex = i;
      } else {
        secondSectionIndex = i;
        break;
      }
    }
  }

  if (firstSectionIndex === null || secondSectionIndex === null) {
    console.log("Sections not found");
    return;
  }

  for (let i = firstSectionIndex + 1; i < secondSectionIndex; i++) {
    const el = elements[i];

    const folderIcon = await el.$(
      '[data-automation-id="folder-open-icon"], [data-automation-id="folder-icon"]',
    );

    if (folderIcon) {
      pageIndexMap[i] = false;

      const isOpen = await el.$('[data-automation-id="folder-open-icon"]');

      if (!isOpen) {
        await el.click();
        await waitForUiState401(browserTab);
      }

      continue;
    }

    pageIndexMap[i] = true;
  }
};

/**
 * Loops through all pages (except for hp)
 */
export const runPagesTranslation = async () => {
  const pageIndexes = Object.keys(pageIndexMap)
    .map(Number)
    .filter((index) => pageIndexMap[index] === true);

  for (let i = 0; i < pageIndexes.length; i++) {
    const pageIndex = pageIndexes[i];
    process.stdout.write(`\rPage ${pageIndex}: 🔄 перевод...`);

    const pageEl = await openPageByIndex(pageIndex);

    let pageName = await browserTab.$eval("[data-page-name]", (el) =>
      el.getAttribute("data-page-name"),
    );

    if (!pageEl) {
      process.stdout.write("\r\x1b[K");
      console.log(
        chalk.red(
          `Page ${pageIndex}: ⏭ PageEl not found, skipped - ${pageName}`,
        ),
      );
      continue;
    }

    const treeNode = await getFirstTreeNode();

    if (!treeNode) {
      process.stdout.write("\r\x1b[K");

      console.log(
        chalk.red(
          `Page ${pageIndex}: ⏭ TreeNode not found, skipped  - ${pageName}`,
        ),
      );
      continue;
    }

    await translatePage(treeNode);
    process.stdout.write("\r\x1b[K");
    pageName = await browserTab.$eval("[data-page-name]", (el) =>
      el.getAttribute("data-page-name"),
    );

    console.log(chalk.green(`Page ${pageIndex}: ✅ Success - ${pageName}`));
  }

  console.log(chalk.green("✅ All pages translated!"));
};
