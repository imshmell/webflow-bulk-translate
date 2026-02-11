import { waitForWebflowResponse, waitUntilDetached } from "./composables.js";

/**
 * Checks if multiple locales exist in the Webflow admin
 * @param {import('puppeteer-core').Page} browserTab
 */
export const checkLocales = async (browserTab) => {
  console.log("🚀 Starting automation...");
  const selector = '[data-automation-id="locale-switcher-trigger"]';
  const localeTrigger = await browserTab.$(selector);

  if (!localeTrigger) {
    console.log("⚠️ Locale switcher not found — single locale");
    return;
  }

  console.log("🌍 Locale switcher found");

  // Click the locale switcher and wait for Webflow response
  await Promise.all([
    localeTrigger.click(),
    waitForWebflowResponse(browserTab),
  ]);

  // Wait for the searchable list of locales to appear
  await browserTab.waitForSelector(
    '[data-automation-id="locale-switch-searchable-list"]',
    { visible: true },
  );

  // Count the number of locales
  const count = await browserTab.$$eval(
    '[data-palette="VirtualizedSearchableListGroup"]',
    (nodes) => nodes.length,
  );
  console.log(`✅ Found locales: ${count}`);

  // Close the locale menu
  await browserTab.keyboard.press("Escape");
  console.log("🛑 Escape pressed");

  // Wait until the locale menu is removed from the DOM
  await waitUntilDetached(
    browserTab,
    '[data-automation-id="locale-menu-content"]',
  );
};
