import puppeteer from "puppeteer-core";
import readline from "readline";
import chalk from "chalk";
import { exec } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";
import { setBrowserTab } from "./pages.js";

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const CHROME_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUG_PORT = 9222;
const LOGIN_URL = "https://webflow.com/login";
const ADMIN_URL_PART = "design.webflow.com";
const PROFILE_PATH = path.resolve("./chrome-profile");

export const runBrowser = async () => {
  // ─────────────────────────────────────────────
  // Create profile folder if missing
  // ─────────────────────────────────────────────
  if (!fs.existsSync(PROFILE_PATH)) fs.mkdirSync(PROFILE_PATH);

  // ─────────────────────────────────────────────
  // Check if remote debugging port is open
  // ─────────────────────────────────────────────
  const isChromeRunning = (url) => {
    return new Promise((resolve) => {
      http
        .get(url, (res) => resolve(res.statusCode === 200))
        .on("error", () => resolve(false));
    });
  };

  // ─────────────────────────────────────────────
  // Launch Chrome with remote debugging
  // ─────────────────────────────────────────────
  const launchChrome = () => {
    console.log("🚀 Launching Chrome with Webflow login...");
    const command = `"${CHROME_PATH}" --remote-debugging-port=${DEBUG_PORT} --user-data-dir="${PROFILE_PATH}" --new-window ${LOGIN_URL}`;
    exec(command, (err) => {
      if (err) console.error(chalk.red("❌ Failed to launch Chrome:", err));
    });
  };

  // ─────────────────────────────────────────────
  // Wait for user to press Enter
  // ─────────────────────────────────────────────
  const waitForEnter = (message = "Press Enter to continue...\n") => {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(message, () => {
        rl.close();
        resolve();
      });
    });
  };

  // ─────────────────────────────────────────────
  // Wait until remote debugging port is available
  // ─────────────────────────────────────────────
  const waitForChromeDebugPort = (url, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = async () => {
        const running = await isChromeRunning(url);
        if (running) resolve(true);
        else if (Date.now() - start > timeout)
          reject(new Error(chalk.red("❌ Chrome did not start on port 9222")));
        else setTimeout(check, 500);
      };
      check();
    });
  };

  // ─────────────────────────────────────────────
  // Find the main browser tab
  // ─────────────────────────────────────────────
  const findBrowserTab = async (browser) => {
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url().includes(ADMIN_URL_PART)) return page;
    }
    return null;
  };

  // ─────────────────────────────────────────────
  // RUN
  // ─────────────────────────────────────────────
  const debugUrl = `http://127.0.0.1:${DEBUG_PORT}/json/version`;
  const chromeAlreadyRunning = await isChromeRunning(debugUrl);

  if (!chromeAlreadyRunning) {
    launchChrome();

    try {
      await waitForChromeDebugPort(debugUrl, 15000);
      console.log(chalk.green("✅ Chrome started and port 9222 is available"));
    } catch (err) {
      console.error(chalk.red(err));
      process.exit(1);
    }

    await waitForEnter(
      "👉 Log in, open the Webflow admin with the correct locale (URL must contain 'locale=') and press Enter...\n",
    );
  } else {
    await waitForEnter(
      "👉 Chrome is already running. Make sure Webflow admin is open with the correct locale (URL must contain 'locale=') and press Enter to continue\n",
    );
    console.log("🔌 Connecting to existing Chrome window...");
  }

  // ─────────────────────────────────────────────
  // Connect via puppeteer-core
  // ─────────────────────────────────────────────
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${DEBUG_PORT}`,
    defaultViewport: null,
  });

  // ─────────────────────────────────────────────
  // Find the admin page tab
  // ─────────────────────────────────────────────

  const browserTab = await findBrowserTab(browser);

  if (!browserTab) {
    console.error(chalk.red("❌ Admin page not found"));
    await browser.disconnect();
    process.exit(1);
  }

  if (!browserTab.url().includes("locale=")) {
    console.error(
      chalk.red(
        "❌ Admin page does not contain 'locale=' in URL. Please open the localized version and restart.",
      ),
    );
    await browser.disconnect();
    process.exit(1);
  }

  setBrowserTab(browserTab);

  console.log(
    chalk.green("✅ Admin page found with correct locale:", browserTab.url()),
  );
  return browserTab;
};
