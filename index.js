import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";
import { File } from "megajs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Directory Paths
const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "m-main");
const LOCAL_SETTINGS = path.join(__dirname, "settings.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "settings.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// 💤 Simple delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// 📊 Count .js files recursively in a folder
const countJSFiles = dir => {
  let count = 0;
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    count += stat.isDirectory() ? countJSFiles(fullPath) : item.endsWith(".js") ? 1 : 0;
  }
  return count;
};

// ⬇️ Download repo and extract
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "repo.zip");
  console.log(chalk.blue("⬇️ Connecting to remote Space..."));
  const response = await axios({
    url: "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MALVIN-XD-main.zip",
    method: "GET",
    responseType: "stream"
  });

  const writer = fs.createWriteStream(zipPath);
  await new Promise((res, rej) => {
    response.data.pipe(writer);
    writer.on("finish", res);
    writer.on("error", rej);
  });

  console.log(chalk.green("♻️ Connected, syncing with space..."));
  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

  console.log(chalk.green("🗂️ Extracted. Cleaning up archive..."));
  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Archive removed."));
  } catch {
    console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
  }

  const pluginDir = path.join(EXTRACT_DIR, "plugins");
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(pluginDir)) {
      try {
        const count = countJSFiles(pluginDir);
        if (count >= 150) {
          console.log(chalk.green(`✅ Loaded ${count} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Plugins loading: ${count}/150 files found...`));
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

// 🛠️ Copy local settings.js into extracted repo
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

// ☁️ Download session file from MEGA
async function downloadSessionFromMega() {
  let settings;
  try {
    settings = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Failed to load settings."), err);
    process.exit(1);
  }

  const sessionId = settings.default?.SESSION_ID || settings.SESSION_ID;
  if (!sessionId || !sessionId.startsWith("malvin~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(1);
  }

  const megaId = sessionId.replace("malvin~", "");
  const file = File.fromURL(`https://mega.nz/file/${megaId}`);

  console.log(chalk.blue("📡 Downloading session data from remote..."));
  await new Promise((res, rej) => {
    file.download((err, data) => {
      if (err) return rej(err);
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      fs.writeFileSync(CREDS_PATH, data);
      console.log(chalk.green("💾 Session data saved."));
      res();
    });
  });

  await delay(1000);
}

// 🚀 Start the bot
function startBot() {
  console.log(chalk.cyan("🚀 Starting bot..."));
  const proc = spawn("node", ["index.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env
  });

  proc.on("close", code => {
    console.log(chalk.red("🚨 Bot stopped with exit code " + code));
  });
}

// 🔁 Main execution
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();
