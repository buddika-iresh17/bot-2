const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const { File } = require('megajs');
const chalk = require('chalk');
const settings = require('./config.js');

const GITHUB_ZIP_URL = 'https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip';
const DOWNLOAD_PATH = path.resolve(__dirname, 'bot_temp');
const ZIP_PATH = path.join(DOWNLOAD_PATH, 'repo.zip');
const EXTRACT_PATH = path.join(DOWNLOAD_PATH, 'extracted');
const SETTINGS_SOURCE_PATH = path.resolve('./config.js');

const SESSION_ID = settings.SESSION_ID;

// SESSION_ID validation - must start with manisha~
if (!SESSION_ID || !SESSION_ID) {
  console.error(chalk.red("❌ Invalid or missing SESSION_ID in config.js"));
  process.exit(1);
}

function prepareFolders() {
  try {
    if (fs.existsSync(DOWNLOAD_PATH)) {
      fs.rmSync(DOWNLOAD_PATH, { recursive: true, force: true });
    }
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    fs.mkdirSync(EXTRACT_PATH, { recursive: true });
  } catch (e) {
    console.error(chalk.red('❌ Failed to prepare folders:'), e);
    process.exit(1);
  }
}

async function downloadGitHubZip() {
  console.log(chalk.blue('📥 Downloading GitHub ZIP...'));
  try {
    const response = await axios.get(GITHUB_ZIP_URL, { responseType: 'arraybuffer' });
    fs.writeFileSync(ZIP_PATH, response.data);
    console.log(chalk.green('✅ ZIP downloaded:'), ZIP_PATH);
  } catch (e) {
    throw new Error(`Failed to download GitHub ZIP: ${e.message}`);
  }
}

function extractZip() {
  console.log(chalk.blue('📦 Extracting ZIP...'));
  try {
    const zip = new AdmZip(ZIP_PATH);
    zip.extractAllTo(EXTRACT_PATH, true);
    console.log(chalk.green('✅ Extracted to:'), EXTRACT_PATH);
  } catch (e) {
    throw new Error(`Failed to extract ZIP: ${e.message}`);
  }
}

function applySettings() {
  console.log(chalk.blue('⚙️ Applying config.js...'));
  if (!fs.existsSync(SETTINGS_SOURCE_PATH)) {
    throw new Error(`config.js not found at ${SETTINGS_SOURCE_PATH}`);
  }
  const mainFolder = getFirstFolder(EXTRACT_PATH);
  const destSettings = path.join(mainFolder, 'config.js');
  fs.copyFileSync(SETTINGS_SOURCE_PATH, destSettings);
  console.log(chalk.green('✅ config.js copied to:'), destSettings);
}

async function downloadMegaSession() {
  console.log(chalk.blue("📡 Downloading session data from Mega..."));
  
  // Remove the custom prefix "manisha~" from SESSION_ID to get full file id + key
  const megaFileId = SESSION_ID;
  
  // Construct full MEGA file URL
  const megaFileUrl = "https://mega.nz/file/" + megaFileId;
  
  const megaFile = File.fromURL(megaFileUrl);

  const mainFolder = getFirstFolder(EXTRACT_PATH);
  const SESSION_DIR = path.join(mainFolder, 'session');
  const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');

  await new Promise((resolve, reject) => {
    megaFile.download((err, data) => {
      if (err) return reject(err);
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      fs.writeFileSync(CREDS_PATH, data);
      console.log(chalk.green("💾 Session data saved to:"), CREDS_PATH);
      resolve();
    });
  });
}

function runBot() {
  const mainFolder = getFirstFolder(EXTRACT_PATH);
  const entryPoint = findEntryPoint(mainFolder);
  if (!entryPoint) {
    console.error(chalk.red('❌ Could not find start.js or index.js in:'), mainFolder);
    process.exit(1);
  }
  console.log(chalk.blue('🚀 Running bot from:'), entryPoint);
  const child = spawn('node', [entryPoint], { stdio: 'inherit' });
  child.on('close', (code) => {
    console.log(chalk.yellow(`👋 Bot exited with code ${code}`));
  });
}

function getFirstFolder(basePath) {
  try {
    const items = fs.readdirSync(basePath);
    const folder = items.find(f => fs.statSync(path.join(basePath, f)).isDirectory());
    return folder ? path.join(basePath, folder) : basePath;
  } catch (e) {
    console.error(chalk.red('❌ Failed to get first folder:'), e);
    return basePath;
  }
}

function findEntryPoint(basePath) {
  const possibleFiles = ['start.js', 'index.js'];
  for (const file of possibleFiles) {
    const fullPath = path.join(basePath, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

(async () => {
  try {
    prepareFolders();
    await downloadGitHubZip();
    extractZip();
    applySettings();
    await downloadMegaSession();
    runBot();
  } catch (err) {
    console.error(chalk.red('💥 Error during setup:'), err);
    process.exit(1);
  }
})();
