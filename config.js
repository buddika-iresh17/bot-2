require('dotenv').config();

module.exports = {
  SESSION_ID: process.env.SESSION_ID,
  MODE: process.env.MODE || "private",
  PREFIX: process.env.PREFIX || ".",
  AUTO_REACT: process.env.AUTO_REACT === "true",
  ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "inbox",
  DEV: process.env.DEV || "94721551183",
  READ_MESSAGE: process.env.READ_MESSAGE === "true",
  AUTO_READ_STATUS: process.env.AUTO_READ_STATUS === "true",
  AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY === "true",
  AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT === "true",
  AUTOLIKESTATUS: process.env.AUTOLIKESTATUS === "true",
  AUTO_TYPING: process.env.AUTO_TYPING === "true",
  AUTO_RECORDING: process.env.AUTO_RECORDING === "true",
  ALWAYS_ONLINE: process.env.ALWAYS_ONLINE === "true",
  UNIFIED_PROTECTION: process.env.UNIFIED_PROTECTION || "kick",
};
