import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";
import { File } from "megajs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "MANISHA-MD-2");
const LOCAL_SETTINGS = path.join(__dirname, "config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "config.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// Config
const ZIP_URL = "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip";
const TEST_MODE = process.argv.includes("--test");

const delay = ms => new Promise(res => setTimeout(res, ms));

const countJSFiles = dir => {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    count += stat.isDirectory() ? countJSFiles(full) : file.endsWith(".js") ? 1 : 0;
  }
  return count;
};

async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "repo.zip");

  console.log(chalk.blue("⬇️ Downloading zip from GitHub..."));
  const response = await axios({
    url: ZIP_URL,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  if (fs.statSync(zipPath).size < 10000) {
    console.error(chalk.red("❌ Downloaded ZIP seems too small. Aborting."));
    process.exit(1);
  }

  console.log(chalk.green("♻️ Extracting ZIP..."));
  try {
    const zip = new AdmZip(zipPath);
    for (const entry of zip.getEntries()) {
      if (entry.entryName.includes("..")) {
        throw new Error("Unsafe ZIP path detected.");
      }
    }
    zip.extractAllTo(TEMP_DIR, true);
  } catch (err) {
    console.error(chalk.red("❌ ZIP extraction failed."), err);
    process.exit(1);
  }

  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Removed ZIP file."));
  } catch {
    console.warn(chalk.yellow("⚠️ Could not remove ZIP file, continuing..."));
  }

  const pluginDir = path.join(EXTRACT_DIR, "plugins");
  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(pluginDir)) {
      try {
        const found = countJSFiles(pluginDir);
        if (found >= 100) {
          console.log(chalk.green(`✅ Loaded ${found} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Loading plugins: ${found}/100 files found...`));
        }
      } catch {
        console.log(chalk.red("⚠️ Error reading plugins folder."));
      }
    } else {
      console.log(chalk.gray("🔍 Waiting for plugins folder..."));
    }

    if (i === 29) {
      console.error(chalk.red("❌ Plugins folder not found or not fully extracted after 15s."));
      process.exit(1);
    }

    await delay(500);
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ config.js not found. Skipping..."));
    return;
  }

  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Applied local config.js."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to copy config.js"), err);
  }

  await delay(1000);
}

async function downloadSessionFromMega() {
  let settingsModule;
  try {
    settingsModule = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Cannot load config.js"), err);
    process.exit(1);
  }

  const session = settingsModule.SESSION_ID || settingsModule.default?.SESSION_ID;

  if (!session || !session.startsWith("manisha~")) {
    console.error(chalk.red("❌ Invalid SESSION_ID in config.js"));
    process.exit(1);
  }

  const fileID = session.replace("manisha~", "");
  const file = File.fromURL("https://mega.nz/file/" + fileID);

  console.log(chalk.blue("📡 Downloading session from MEGA..."));
  await new Promise((resolve, reject) => {
    file.download((err, data) => {
      if (err) {
        console.error(chalk.red("❌ MEGA session download error:"), err);
        return reject(err);
      }
      try {
        if (fs.existsSync(CREDS_PATH)) {
          console.log(chalk.yellow("⚠️ Session file already exists. Overwriting..."));
        }
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        fs.writeFileSync(CREDS_PATH, data);
        console.log(chalk.green("💾 Session saved."));
        resolve();
      } catch (e) {
        console.error(chalk.red("❌ Failed to save session file."), e);
        reject(e);
      }
    });
  });

  await delay(1000);
}

function startBot() {
  const indexPath = path.join(EXTRACT_DIR, "start.js");

  if (!fs.existsSync(indexPath)) {
    console.error(chalk.red("❌ start.js not found in extracted directory."));
    process.exit(1);
  }

  console.log(chalk.cyan("🚀 Starting MANISHA-MD bot..."));
  const proc = spawn("node", ["start.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  proc.on("error", err => {
    console.error(chalk.red("❌ Failed to start bot process."), err);
  });

  proc.on("close", code => {
    console.log(chalk.red(`🛑 Bot exited with code ${code}`));
  });
}

// Bootstrap execution
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();

  if (!TEST_MODE) {
    startBot();
  } else {
    console.log(chalk.yellow("🧪 Test mode enabled. Skipping bot start."));
  }
})();