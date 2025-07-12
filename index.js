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

const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "bot-MANISHA-MD-2");
const LOCAL_SETTINGS = path.join(__dirname, "settings.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "settings.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function countJSFiles(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += await countJSFiles(fullPath);
    } else if (file.endsWith(".js")) {
      count++;
    }
  }
  return count;
}

async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "repo.zip");
  console.log(chalk.blue("⬇️ Connecting to remote repo and downloading zip..."));

  const response = await axios({
    url: "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip",
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(zipPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("♻️ Download complete. Extracting files..."));
  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Archive removed."));
  } catch {
    console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
  }

  const pluginsFolder = path.join(EXTRACT_DIR, "plugins");

  // Wait and check for plugins folder to have enough .js files (up to 40 seconds max)
  for (let attempt = 0; attempt < 28; attempt++) {
    if (fs.existsSync(pluginsFolder)) {
      try {
        const jsCount = await countJSFiles(pluginsFolder);
        if (jsCount >= 150) { // 0x96 = 150 decimal
          console.log(chalk.green(`✅ Loaded ${jsCount} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Plugins loading: ${jsCount}/150 files found...`));
        }
      } catch {
        console.log(chalk.red("⚠️ Error reading plugins folder, retrying..."));
      }
    } else {
      console.log(chalk.gray("🔍 Waiting for plugins folder..."));
    }
    await delay(500);
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ Local settings.js not found. Skipping applying local settings."));
    return;
  }
  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (error) {
    console.error(chalk.red("❌ Failed applying local settings."), error);
  }
  await delay(1000);
}

async function downloadSessionFromMega() {
  let settings;
  try {
    settings = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (error) {
    console.error(chalk.red("❌ Failed to load settings."), error);
    process.exit(1);
  }

  const SESSION_ID = settings.default?.SESSION_ID || settings.SESSION_ID;
  if (!SESSION_ID || !SESSION_ID.startsWith("manisha~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(1);
  }

  const megaFileId = SESSION_ID.replace("manisha~", "");
  const megaFile = File.fromURL("https://mega.nz/file/" + megaFileId);

  console.log(chalk.blue("📡 Downloading session data from remote Mega storage..."));

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

function startBot() {
  console.log(chalk.cyan("🚀 Starting bot..."));
  const child = spawn("node", ["start.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });
  child.on("close", code => {
    console.log(chalk.red(`🚨 Bot stopped with exit code ${code}`));
  });
}

(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();
