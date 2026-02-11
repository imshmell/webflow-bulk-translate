import { runBrowser } from "./src/browser.js";
import { checkLocales } from "./src/locale.js";
import { openFoldersAndBuildPagesMap } from "./src/pages.js";
import { runPagesTranslation } from "./src/pages.js";

(async () => {
  const browserTab = await runBrowser();
  await checkLocales(browserTab);
  await openFoldersAndBuildPagesMap();
  await runPagesTranslation();
})();
