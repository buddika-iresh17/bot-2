import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";
import { File } from "megajs";

// Resolve __filename and __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define directories and paths
const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "MANISHA-MD-2");
const LOCAL_SETTINGS = path.join(__dirname, "config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "config.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// Helper: Delay in milliseconds
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Recursively count .js files in a directory
const countJSFiles = dir => {
  let count = 0;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += countJSFiles(fullPath);
    } else if (entry.endsWith(".js")) {
      count++;
    }
  }
  return count;
};

// Download zip archive from GitHub, extract, clean, and wait for plugins
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹  Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "MANISHA-MD-2.zip");

  console.log(chalk.blue("⬇️  Connecting to remote Space..."));
  const response = await axios({
    url: "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip",
    method: "GET",
    responseType: "stream",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const writer = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("♻️ Connected  syncing with space..."));

  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

  console.log(chalk.green("🗂️  done. Cleaning up archive..."));
  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Archive removed."));
  } catch {
    console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
  }

  const pluginsDir = path.join(EXTRACT_DIR, "plugins");
  const requiredPluginCount = 150; // 0x96

  // Wait up to ~20 seconds for plugins to appear
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(pluginsDir)) {
      try {
        const jsCount = countJSFiles(pluginsDir);
        if (jsCount >= requiredPluginCount) {
          console.log(chalk.green(`✅ Loaded ${jsCount} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Plugins loading: ${jsCount}/${requiredPluginCount} files found...`));
        }
      } catch {
        console.log(chalk.red("⚠️ Error reading plugins, retrying..."));
      }
    } else {
      console.log(chalk.gray("🔍 Waiting for plugins folder..."));
    }
    await delay(500);
  }
}

// Copy local settings.js to extracted folder if it exists
async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ Local settings.js not found. Skipping."));
    return;
  }
  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (err) {
    console.error(chalk.red("❌ Failed applying local settings."), err);
  }
  await delay(1000);
}

// Download session data file from Mega.nz using SESSION_ID in settings.js
async function downloadSessionFromMega() {
  let settingsModule;
  try {
    settingsModule = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Failed to load settings."), err);
    process.exit(1);
  }

  // Support ES module default export or plain export
  const SESSION_ID = settingsModule.default?.SESSION_ID || settingsModule.SESSION_ID;

  if (!SESSION_ID || !SESSION_ID.startsWith("manisha ~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(1);
  }

  const megaFileId = SESSION_ID.replace("manisha~", "");
  const megaFile = File.fromURL(`https://mega.nz/file/${megaFileId}`);

  console.log(chalk.blue("📡 Downloading session data from remote..."));

  await new Promise((resolve, reject) => {
    megaFile.download((err, data) => {
      if (err) return reject(err);

      fs.mkdirSync(SESSION_DIR, { recursive: true });
      fs.writeFileSync(CREDS_PATH, data);

      console.log(chalk.green("💾 Session data saved."));
      resolve();
    });
  });

  await delay(1000);
}

// Spawn the extracted bot index.js as child process
function startBot() {
  console.log(chalk.cyan("🚀 Starting bot..."));

  const botProcess = spawn("node", ["start.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  botProcess.on("close", code => {
    console.log(chalk.red(`🚨 Bot stopped with exit code ${code}`));
  });
}

// Main launcher workflow
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();