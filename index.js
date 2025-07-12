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

// Paths
const TEMP_DIR = path.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = path.join(TEMP_DIR, "MANISHA-MD-2");
const LOCAL_SETTINGS = path.join(__dirname, "config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "config.js");
const SESSION_DIR = path.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = path.join(SESSION_DIR, "creds.json");

// Utility delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Recursively count JS files in folder
function countJSFiles(folder) {
  let count = 0;
  for (const file of fs.readdirSync(folder)) {
    const fullPath = path.join(folder, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += countJSFiles(fullPath);
    } else if (file.endsWith(".js")) {
      count++;
    }
  }
  return count;
}

// Download the bot zip and extract
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning old files..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "MANISHA-MD-2.zip");
  const downloadUrl = "https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip";

  console.log(chalk.blue("⬇️ Downloading bot archive..."));

  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
  });

  // Write stream to file
  const writer = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("♻️ Extracting archive..."));

  // Extract all files
  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);

  // Delete zip after extraction
  try {
    fs.unlinkSync(zipPath);
    console.log(chalk.green("🧹 Archive removed."));
  } catch {
    console.warn(chalk.yellow("⚠️ Failed to remove archive, continuing..."));
  }

  // Wait for plugins folder to have enough JS files or timeout
  const pluginsFolder = path.join(EXTRACT_DIR, "plugins");
  const requiredPlugins = 150;

  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(pluginsFolder)) {
      try {
        const found = countJSFiles(pluginsFolder);
        if (found >= requiredPlugins) {
          console.log(chalk.green(`✅ Loaded ${found} plugin files.`));
          break;
        } else {
          console.log(chalk.gray(`⏳ Plugins loading: ${found}/${requiredPlugins} files found...`));
        }
      } catch {
        console.log(chalk.red("⚠️ Error reading plugins folder, retrying..."));
      }
    } else {
      console.log(chalk.gray("🔍 Waiting for plugins folder..."));
    }
    await delay(200);
  }
}

// Apply local config.js over extracted config.js
async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.warn(chalk.red("⚠️ Local config.js not found. Skipping local settings."));
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

// Download session data from Mega.nz using SESSION_ID
async function downloadSessionFromMega() {
  let settings;
  try {
    settings = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (err) {
    console.error(chalk.red("❌ Failed to load extracted config."), err);
    process.exit(1);
  }

  // Support default export or named export
  const config = settings.default ?? settings;
  const SESSION_ID = config.SESSION_ID;

  if (!SESSION_ID || !SESSION_ID.startsWith("manisha~")) {
    console.error(chalk.red("❌ Invalid or missing SESSION_ID in config.js"));
    process.exit(1);
  }

  // Extract file ID from SESSION_ID
  const megaFileId = SESSION_ID.replace("manisha~", "");
  const megaFileUrl = `https://mega.nz/file/${megaFileId}`;
  const megaFile = File.fromURL(megaFileUrl);

  console.log(chalk.blue("📡 Downloading session data from Mega.nz..."));

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

// Start the bot by spawning child process to run start.js
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

// Main bootstrapper flow
(async () => {
  try {
    await downloadAndExtract();
    await applyLocalSettings();
    await downloadSessionFromMega();
    startBot();
  } catch (error) {
    console.error(chalk.red("❌ Fatal error in bootstrapper:"), error);
  }
})();