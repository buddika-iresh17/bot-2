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
const EXTRACT_DIR = path.join(TEMP_DIR, "MANISHA-MD-2");  // <== Updated folder name here
const LOCAL_SETTINGS = path.join(__dirname, "config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "config.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// 🕓 Delay Utility
const delay = ms => new Promise(res => setTimeout(res, ms));

// 🔍 Count JS files
const countJSFiles = dir => {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    count += stat.isDirectory() ? countJSFiles(fullPath) : file.endsWith(".js") ? 1 : 0;
  }
  return count;
};

// ⬇️ Download and Extract GitHub ZIP
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "MANISHA-MD-2.zip");
  console.log(chalk.blue("⬇️ Downloading from GitHub..."));

  const downloadUrl = "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip";

  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream"
  });

  const writer = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("♻️ Extracting ZIP..."));
  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Archive removed."));
  } catch {
    console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
  }

  const pluginsDir = path.join(EXTRACT_DIR, "plugins");

  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(pluginsDir)) {
      try {
        const pluginCount = countJSFiles(pluginsDir);
        if (pluginCount >= 150) {
          console.log(chalk.green(`✅ Loaded ${pluginCount} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Plugins loading: ${pluginCount}/150 files found...`));
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

// ⚙️ Apply local settings.js to downloaded repo
async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ Local settings.js not found. Skipping."));
    return;
  }

  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (e) {
    console.error(chalk.red("❌ Failed applying local settings."), e);
  }

  await delay(1000);
}

// ☁️ Download session file from Mega
async function downloadSessionFromMega() {
  let settings;
  try {
    settings = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Failed to load settings.js"), err);
    process.exit(1);
  }

  const SESSION_ID = settings.default?.SESSION_ID || settings.SESSION_ID;
  if (!SESSION_ID || !SESSION_ID.startsWith("manisha~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(1);
  }

  const megaId = SESSION_ID.replace("manisha~", ""); // adjust prefix if needed
  const file = File.fromURL("https://mega.nz/file/" + megaId);

  console.log(chalk.blue("📡 Downloading session data from MEGA..."));

  await new Promise((resolve, reject) => {
    file.download((err, data) => {
      if (err) return reject(err);

      fs.mkdirSync(SESSION_DIR, { recursive: true });
      fs.writeFileSync(CREDS_PATH, data);
      console.log(chalk.green("💾 Session data saved."));
      resolve();
    });
  });

  await delay(1000);
}

// 🚀 Start the bot
function startBot() {
  console.log(chalk.cyan("🚀 Starting bot..."));
  const proc = spawn("node", ["start.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  proc.on("close", code => {
    console.log(chalk.red("🚨 Bot stopped with exit code " + code));
  });
}

// ✅ Run Everything
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();