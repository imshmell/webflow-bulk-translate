/**
 * Waits for Webflow to return a response to a POST request to the analytics API
 * Use while opening pages and navigator buttons
 * @param {import('puppeteer-core').Page} page
 * @param {string} urlSubstring - part of the URL to match the request
 * @param {number} timeout - maximum waiting time in ms
 */
export const waitForWebflowResponse = async (
  page,
  urlSubstring = "https://analytics-api.webflow.com/v1/t",
  timeout = 10000,
) => {
  await page.waitForResponse(
    (response) =>
      response.url().includes(urlSubstring) &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout },
  );
  // console.log("✅ Webflow response received");
};

/**
 * Waits for Webflow to return a response when navigating to a new page
 * @param {import('puppeteer-core').Page} page
 * @param {string} urlSubstring - part of the URL to match the request
 * @param {number} timeout - maximum waiting time in ms
 */
export const waitForWebflowPageChange = async (
  page,
  urlSubstring = "design.webflow.com/api/pages/",
  timeout = 10000,
) => {
  await page.waitForResponse(
    (response) =>
      response.url().includes(urlSubstring) &&
      response.request().method() === "GET" &&
      response.status() === 200,
    { timeout },
  );
  // console.log("✅ Webflow page changed");
};

/**
 * Waits for Webflow to finish a translation request
 * @param {import('puppeteer-core').Page} page
 * @param {string} urlSubstring - part of the URL to match the request
 * @param {number} timeout - maximum waiting time in ms
 */
export const waitForWebflowTranslation = async (
  page,
  urlSubstring = "translations",
  timeout = 10000,
) => {
  await page.waitForResponse(
    (response) =>
      response.url().includes(urlSubstring) &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout },
  );
  // console.log("✅ Webflow translation done");
};

/**
 * Waits until an element is removed from the page
 * Used to check if locale has been closed
 * @param {import('puppeteer-core').Page} page
 * @param {string} selector - CSS selector of the element
 * @param {number} timeout - maximum waiting time in ms
 */
export const waitUntilDetached = async (page, selector, timeout = 10000) => {
  await page.waitForFunction(
    (sel) => !document.querySelector(sel),
    { timeout },
    selector,
  );
  console.log("✅", selector, "has disappeared");
};

/**
 * Waits for a PUT request to /api/sites/{siteId}/uistate
 * Used while opening folders
 * @param {import('puppeteer-core').Page} page
 * @param {number} timeout - maximum waiting time in ms
 */
export const waitForUiState401 = async (page, timeout = 10000) => {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const method = response.request().method();

      const isUiState = url.includes("/api/sites/") && url.endsWith("/uistate");

      if (isUiState && method === "PUT") {
        return true;
      }

      return false;
    },
    { timeout },
  );
};
