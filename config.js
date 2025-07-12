import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('config.env')) dotenv.config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

export const SESSION_ID = process.env.SESSION_ID || "manisha~BycRgDja#LWoUdcYkpYXQCbqPUJEondSin_M2-BUs-faYy6Hv8Iw";
export const MODE = process.env.MODE || "private";
export const PREFIX = process.env.PREFIX || ".";
export const AUTO_REACT = convertToBool(process.env.AUTO_REACT, "true");
export const ANTI_DEL_PATH = process.env.ANTI_DEL_PATH || "inbox";
export const DEV = process.env.DEV || "94721551183";
export const READ_MESSAGE = convertToBool(process.env.READ_MESSAGE, "true");
export const AUTO_READ_STATUS = convertToBool(process.env.AUTO_READ_STATUS, "true");
export const AUTO_STATUS_REPLY = convertToBool(process.env.AUTO_STATUS_REPLY, "true");
export const AUTO_STATUS_REACT = convertToBool(process.env.AUTO_STATUS_REACT, "true");
export const AUTOLIKESTATUS = convertToBool(process.env.AUTOLIKESTATUS, "true");
export const AUTO_TYPING = convertToBool(process.env.AUTO_TYPING, "true");
export const AUTO_RECORDING = convertToBool(process.env.AUTO_RECORDING, "true");
export const ALWAYS_ONLINE = convertToBool(process.env.ALWAYS_ONLINE, "true");
export const UNIFIED_PROTECTION = process.env.UNIFIED_PROTECTION || "kick"; // "off" | "warn" | "kick" | "strict"
