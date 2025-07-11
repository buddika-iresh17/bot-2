const _0x2215c5 = function () {
  let _0x3f0543 = true;
  return function (_0x4fa26c, _0x1e72e4) {
    const _0x44c4d2 = _0x3f0543 ? function () {
      if (_0x1e72e4) {
        const _0x236cba = _0x1e72e4.apply(_0x4fa26c, arguments);
        _0x1e72e4 = null;
        return _0x236cba;
      }
    } : function () {};
    _0x3f0543 = false;
    return _0x44c4d2;
  };
}();
(function () {
  _0x2215c5(this, function () {
    const _0x342f30 = new RegExp("function *\\( *\\)");
    const _0x4cb2a1 = new RegExp("\\+\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)", "i");
    const _0xf16a7c = _0x165d0("init");
    if (!_0x342f30.test(_0xf16a7c + "chain") || !_0x4cb2a1.test(_0xf16a7c + "input")) {
      _0xf16a7c("0");
    } else {
      _0x165d0();
    }
  })();
})();
import _0x134c2e from "fs";
import _0x266aa2 from "path";
import _0x477c1 from "axios";
import _0xd7a8d7 from "adm-zip";
import { spawn } from "child_process";
import _0x108124 from "chalk";
import { fileURLToPath, pathToFileURL } from "url";
import { File } from "megajs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = _0x266aa2.dirname(__filename);
const TEMP_DIR = _0x266aa2.join(__dirname, ".npm", ".botx_cache");
const EXTRACT_DIR = _0x266aa2.join(TEMP_DIR, "bot-main");
const LOCAL_SETTINGS = _0x266aa2.join(__dirname, "settings.js");
const EXTRACTED_SETTINGS = _0x266aa2.join(EXTRACT_DIR, "settings.js");
const SESSION_DIR = _0x266aa2.join(EXTRACT_DIR, "sessions");
const CREDS_PATH = _0x266aa2.join(SESSION_DIR, "creds.json");
const delay = _0x2e92ab => new Promise(_0x3b1da2 => setTimeout(_0x3b1da2, _0x2e92ab));
const countJSFiles = _0x4e92e1 => {
  let _0x48586b = 0x0;
  for (const _0xa09491 of _0x134c2e.readdirSync(_0x4e92e1)) {
    const _0x3fa124 = _0x266aa2.join(_0x4e92e1, _0xa09491);
    const _0x56ff93 = _0x134c2e.statSync(_0x3fa124);
    _0x48586b += _0x56ff93.isDirectory() ? countJSFiles(_0x3fa124) : _0xa09491.endsWith(".js") ? 0x1 : 0x0;
  }
  return _0x48586b;
};
async function downloadAndExtract() {
  if (_0x134c2e.existsSync(TEMP_DIR)) {
    console.log(_0x108124.yellow("🧹  Cleaning old files..."));
    const _0x325979 = {
      "recursive": true,
      "force": true
    };
    _0x134c2e.rmSync(TEMP_DIR, _0x325979);
  }
  const _0xbc345f = {
    "recursive": true
  };
  _0x134c2e.mkdirSync(TEMP_DIR, _0xbc345f);
  const _0x35263a = _0x266aa2.join(TEMP_DIR, "REPO.zip");
  console.log(_0x108124.blue("⬇️  Connecting to remote Space..."));
  const _0x4d5005 = await _0x477c1({
    "url": "https://github.com/buddika-iresh17/Bot/archive/refs/heads/main.zip",
    "method": "GET",
    "responseType": "stream",
    "headers": {
      "Authorization": "token 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",
      "Accept": "application/vnd.github.v3.raw"
    }
  });
  const _0x212ad4 = _0x134c2e.createWriteStream(_0x35263a);
  await new Promise((_0x4e0bfe, _0xc34bb3) => {
    _0x4d5005.data.pipe(_0x212ad4);
    _0x212ad4.on("finish", _0x4e0bfe);
    _0x212ad4.on("error", _0xc34bb3);
  });
  console.log(_0x108124.green("♻️ Connected  syncing with space..."));
  new _0xd7a8d7(_0x35263a).extractAllTo(TEMP_DIR, true);
  console.log(_0x108124.green("🗂️  done. Cleaning up archive..."));
  try {
    _0x134c2e.unlinkSync(_0x35263a);
    console.log(_0x108124.green("🧹 Archive removed."));
  } catch {
    console.warn(_0x108124.yellow("⚠️ Failed to remove archive, continuing..."));
  }
  const _0x4bb80f = _0x266aa2.join(EXTRACT_DIR, "plugins");
  for (let _0x28f411 = 0x0; _0x28f411 < 0x28; _0x28f411++) {
    if (_0x134c2e.existsSync(_0x4bb80f)) {
      try {
        const _0x3d65ff = countJSFiles(_0x4bb80f);
        if (_0x3d65ff >= 0x96) {
          console.log(_0x108124.green("✅ Loaded " + _0x3d65ff + " plugin files."));
          break;
        } else {
          console.log(_0x108124.gray("⏳ Plugins loading: " + _0x3d65ff + "/" + 0x96 + " files found..."));
        }
      } catch {
        console.log(_0x108124.red("⚠️ Error reading plugins, retrying..."));
      }
    } else {
      console.log(_0x108124.gray("🔍 Waiting for plugins folder..."));
    }
    await delay(0x1f4);
  }
}
async function applyLocalSettings() {
  if (!_0x134c2e.existsSync(LOCAL_SETTINGS)) {
    console.warn(_0x108124.red("⚠️ Local settings.js not found. Skipping."));
    return;
  }
  try {
    _0x134c2e.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(_0x108124.green("🛠️ Local settings applied."));
  } catch (_0x430f21) {
    console.error(_0x108124.red("❌ Failed applying local settings."), _0x430f21);
  }
  await delay(0x3e8);
}
async function downloadSessionFromMega() {
  let _0x4681e3;
  try {
    _0x4681e3 = await import(pathToFileURL(EXTRACTED_SETTINGS).href);
  } catch (_0x36b86f) {
    console.error(_0x108124.red("❌ Failed to load settings."), _0x36b86f);
    process.exit(0x1);
  }
  const _0x207a6a = _0x4681e3["default"]?.["SESSION_ID"] || _0x4681e3.SESSION_ID;
  if (!_0x207a6a || !_0x207a6a.startsWith("manisha~")) {
    console.error(_0x108124.red("❌ Invalid or missing SESSION_ID in settings.js"));
    process.exit(0x1);
  }
  const _0xf9f2ec = _0x207a6a.replace("malvin~", '');
  const _0x25570c = File.fromURL("https://mega.nz/file/" + _0xf9f2ec);
  console.log(_0x108124.blue("📡 Downloading session data from remote..."));
  await new Promise((_0x23d899, _0x35d102) => {
    _0x25570c.download((_0x2042d2, _0x13ce8b) => {
      if (_0x2042d2) {
        return _0x35d102(_0x2042d2);
      }
      const _0x3838a8 = {
        recursive: true
      };
      _0x134c2e.mkdirSync(SESSION_DIR, _0x3838a8);
      _0x134c2e.writeFileSync(CREDS_PATH, _0x13ce8b);
      console.log(_0x108124.green("💾 Session data saved."));
      _0x23d899();
    });
  });
  await delay(0x3e8);
}
function startBot() {
  console.log(_0x108124.cyan("🚀 Starting bot..."));
  const _0x514625 = spawn("node", ["index.js"], {
    "cwd": EXTRACT_DIR,
    "stdio": "inherit",
    "env": process.env
  });
  _0x514625.on("close", _0x411e76 => {
    console.log(_0x108124.red("🚨 Bot stopped with exit code " + _0x411e76));
  });
}
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  await downloadSessionFromMega();
  startBot();
})();
function _0x165d0(_0x5d25e3) {
  function _0x371b2b(_0x2ba273) {
    if (typeof _0x2ba273 === "string") {
      return function (_0x38de3d) {}.constructor("while (true) {}").apply("counter");
    } else if (('' + _0x2ba273 / _0x2ba273).length !== 0x1 || _0x2ba273 % 0x14 === 0x0) {
      (function () {
        return true;
      }).constructor("debugger").call("action");
    } else {
      (function () {
        return false;
      }).constructor("debugger").apply("stateObject");
    }
    _0x371b2b(++_0x2ba273);
  }
  try {
    if (_0x5d25e3) {
      return _0x371b2b;
    } else {
      _0x371b2b(0x0);
    }
  } catch (_0x4207d8) {}
}