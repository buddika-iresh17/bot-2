import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { config } from "dotenv";
import { fileURLToPath, pathToFileURL } from "url";
import { File } from "megajs";

// Load .env variables
config();

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "MANISHA-MD-2"); // NOTE: update if ZIP folder name changes
const LOCAL_SETTINGS = path.join(__dirname, "config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "config.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// Delay utility
const delay = ms => new Promise(res => setTimeout(res, ms));

// Recursively count JS files
const countJSFiles = dir => {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += countJSFiles(fullPath);
    } else if (file.endsWith(".js")) {
      count += 1;
    }
  }
  return count;
};

// Download and extract ZIP
async function downloadAndExtract() {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      console.log(chalk.yellow("🧹 Cleaning old files..."));
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const zipPath = path.join(TEMP_DIR, "MANISHA-MD-2.zip");

    console.log(chalk.blue("⬇️ Connecting to remote space..."));

    const zipUrl =
      process.env.ZIP_URL ||
      "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip";

    const response = await axios({
      url: zipUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const writer = fs.createWriteStream(zipPath);
    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(chalk.green("♻️ Syncing ZIP..."));
    new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

    console.log(chalk.green("🗂️ Extract complete. Cleaning archive..."));
    try {
      fs.unlinkSync(zipPath);
      console.log(chalk.green("🧹 Archive removed."));
    } catch {
      console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
    }

    // Plugin folder check loop with updated count condition
    const pluginDir = path.join(EXTRACT_DIR, "plugins");
    const MAX_RETRIES = 40;
    const REQUIRED_PLUGIN_COUNT = 1; // Changed from 150 to 1 for single plugin case

    for (let i = 0; i < MAX_RETRIES; i++) {
      if (fs.existsSync(pluginDir)) {
        try {
          const count = countJSFiles(pluginDir);
          if (count >= REQUIRED_PLUGIN_COUNT) {
            console.log(chalk.green(`✅ Loaded ${count} plugin file(s).`));
            break; // plugins loaded successfully
          } else {
            console.log(chalk.gray(`⏳ Plugins loading: ${count}/${REQUIRED_PLUGIN_COUNT}...`));
          }
        } catch (error) {
          console.log(chalk.red(`⚠️ Error reading plugins: ${error.message}, retrying...`));
        }
      } else {
        console.log(chalk.gray(`🔍 Waiting for plugins folder... (${i + 1}/${MAX_RETRIES})`));
      }
      await delay(1000);
      if (i === MAX_RETRIES - 1) {
        console.error(chalk.red("❌ Plugin loading timed out."));
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(chalk.red("❌ Failed to download or extract ZIP:"), err);
    process.exit(1);
  }
}

// Copy local settings.js if exists
async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ Local settings.js not found. Skipping."));
    return;
  }

  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to apply local settings."), err);
  }

  await delay(1000);
}

// Download session file from Mega.nz
async function downloadSessionFromMega() {
  let settings;
  try {
    settings = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Failed to load settings.js"), err);
    process.exit(1);
  }

  const sessionId = settings.default?.SESSION_ID || settings.SESSION_ID;
  if (!sessionId || !sessionId.startsWith("manisha~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(1);
  }

  const fileId = sessionId.replace("manisha~", "");
  const sessionFile = await File.fromURL("https://mega.nz/file/" + fileId);

  console.log(chalk.blue("📡 Downloading session from Mega.nz..."));

  await new Promise((resolve, reject) => {
    sessionFile.download((err, data) => {
      if (err) return reject(err);
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      fs.writeFileSync(CREDS_PATH, data);
      console.log(chalk.green("💾 Session data saved."));
      resolve();
    });
  });

  await delay(1000);
}

// Start the bot process
function startBot() {
  console.log(chalk.cyan("🚀 Starting bot..."));
  const processRef = spawn("node", ["start.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  processRef.on("close", code => {
    console.log(chalk.red(`🚨 Bot exited with code ${code}`));
  });
}

// Main runner
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();