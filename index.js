const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const { File } = require('megajs');
require('dotenv').config();

// CONFIGURATION
const GITHUB_ZIP_URL = 'https://github.com/buddika-iresh17/Bot/raw/refs/heads/main/MANISHA-MD-2.zip';
const DOWNLOAD_PATH = path.resolve(__dirname, 'bot_temp');
const ZIP_PATH = path.join(DOWNLOAD_PATH, 'repo.zip');
const EXTRACT_PATH = path.join(DOWNLOAD_PATH, 'extracted');
const SETTINGS_SOURCE_PATH = path.resolve('./config.js');
const SESSION_FILE_NAME = 'session/creds.json';

// Validate SESSION_ID
const sessdata = process.env.SESSION_ID;
if (!sessdata || !sessdata.includes('#')) {
  console.error('❌ Invalid SESSION_ID. Must include full MEGA URL with hash.');
  process.exit(1);
}
let MEGA_SESSION_URL = sessdata.startsWith('https://mega.nz/file/')
  ? sessdata
  : 'https://mega.nz/file/' + sessdata;

// Prepare folders
function prepareFolders() {
  try {
    if (fs.existsSync(DOWNLOAD_PATH)) {
      fs.rmSync(DOWNLOAD_PATH, { recursive: true, force: true });
    }
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    fs.mkdirSync(EXTRACT_PATH, { recursive: true });
  } catch (e) {
    console.error('❌ Failed to prepare folders:', e);
    process.exit(1);
  }
}

// Download GitHub ZIP
async function downloadGitHubZip() {
  console.log('📥 Downloading GitHub ZIP...');
  try {
    const response = await axios.get(GITHUB_ZIP_URL, { responseType: 'arraybuffer' });
    fs.writeFileSync(ZIP_PATH, response.data);
    console.log('✅ ZIP downloaded:', ZIP_PATH);
  } catch (e) {
    throw new Error(`Failed to download GitHub ZIP: ${e.message}`);
  }
}

// Extract ZIP
function extractZip() {
  console.log('📦 Extracting ZIP...');
  try {
    const zip = new AdmZip(ZIP_PATH);
    zip.extractAllTo(EXTRACT_PATH, true);
    console.log('✅ Extracted to:', EXTRACT_PATH);
  } catch (e) {
    throw new Error(`Failed to extract ZIP: ${e.message}`);
  }
}

// Copy config.js
function applySettings() {
  console.log('⚙️ Applying config.js...');
  if (!fs.existsSync(SETTINGS_SOURCE_PATH)) {
    throw new Error(`config.js not found at ${SETTINGS_SOURCE_PATH}`);
  }
  const mainFolder = getFirstFolder(EXTRACT_PATH);
  const destSettings = path.join(mainFolder, 'config.js');
  fs.copyFileSync(SETTINGS_SOURCE_PATH, destSettings);
  console.log('✅ config.js copied to:', destSettings);
}

// Download MEGA session
async function downloadMegaSession() {
  console.log('🔐 Downloading MEGA session...');
  const file = File.fromURL(MEGA_SESSION_URL);
  return new Promise((resolve, reject) => {
    file.loadAttributes((err) => {
      if (err) return reject(new Error('Failed to load MEGA file attributes. Check SESSION_ID.'));
      const mainFolder = getFirstFolder(EXTRACT_PATH);
      const sessionPath = path.join(mainFolder, SESSION_FILE_NAME);
      const stream = fs.createWriteStream(sessionPath);
      file.download().pipe(stream);
      stream.on('finish', () => {
        console.log('✅ Session downloaded to:', sessionPath);
        resolve();
      });
      stream.on('error', reject);
    });
  });
}

// Run bot
function runBot() {
  const mainFolder = getFirstFolder(EXTRACT_PATH);
  const entryPoint = findEntryPoint(mainFolder);
  if (!entryPoint) {
    console.error('❌ Could not find start.js or index.js in:', mainFolder);
    process.exit(1);
  }
  console.log('🚀 Running bot from:', entryPoint);
  const child = spawn('node', [entryPoint], { stdio: 'inherit' });
  child.on('close', (code) => {
    console.log(`👋 Bot exited with code ${code}`);
  });
}

// Utility: Get first folder inside a path, fallback to base path
function getFirstFolder(basePath) {
  try {
    const items = fs.readdirSync(basePath);
    const folder = items.find(f => fs.statSync(path.join(basePath, f)).isDirectory());
    return folder ? path.join(basePath, folder) : basePath;
  } catch (e) {
    console.error('❌ Failed to get first folder:', e);
    return basePath;
  }
}

// Utility: Find entry point (start.js or index.js)
function findEntryPoint(basePath) {
  const possibleFiles = ['start.js', 'index.js'];
  for (const file of possibleFiles) {
    const fullPath = path.join(basePath, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

// Main async runner
(async () => {
  try {
    prepareFolders();
    await downloadGitHubZip();
    extractZip();
    applySettings();
    await downloadMegaSession();
    runBot();
  } catch (err) {
    console.error('💥 Error during setup:', err);
    process.exit(1);
  }
})();