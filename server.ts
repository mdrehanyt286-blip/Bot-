import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import _TelegramBot from "node-telegram-bot-api";
import { BotConfig, VideoItem, UserSession, LogEntry } from "./src/types";

const TelegramBot = (_TelegramBot as any).default || _TelegramBot;

// Escape HTML utility for Telegram bot messages to prevent parsing crashes
function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeVideoTitle(title: string): string {
  if (!title) return "";
  let cleaned = title;
  
  // Remove promotional tags like (Join: @Hanime_Universe) or Join: @Hanime_Universe or @Hanime_Universe
  cleaned = cleaned.replace(/Join:?\s*@[A-Za-z0-9_]+/gi, "");
  cleaned = cleaned.replace(/Join\s*@[A-Za-z0-9_]+/gi, "");
  cleaned = cleaned.replace(/@[A-Za-z0-9_]+/g, (match) => {
    const lower = match.toLowerCase();
    if (lower === "@ytx12_b" || lower === "@chat_vip123") {
      return match;
    }
    return "";
  });
  
  // Clean empty parentheses or brackets and double spacing
  cleaned = cleaned.replace(/\(\s*\)/g, "");
  cleaned = cleaned.replace(/\[\s*\]/g, "");
  cleaned = cleaned.replace(/\s\s+/g, " ");
  cleaned = cleaned.trim();
  
  return cleaned || "Uploaded Video";
}

function sanitizeVideoDescription(desc: string): string {
  if (!desc) return "";
  let cleaned = desc;
  
  // Remove promotional/other channels of style @Hanime_Universe
  cleaned = cleaned.replace(/Join:?\s*@[A-Za-z0-9_]+/gi, "");
  cleaned = cleaned.replace(/Join\s*@[A-Za-z0-9_]+/gi, "");
  cleaned = cleaned.replace(/@[A-Za-z0-9_]+/g, (match) => {
    const lower = match.toLowerCase();
    if (lower === "@ytx12_b" || lower === "@chat_vip123") {
      return match;
    }
    return "";
  });
  
  cleaned = cleaned.replace(/\s\s+/g, " ");
  return cleaned.trim();
}

// Global process exception handlers to secure the server from unexpected crashes
process.on("unhandledRejection", (reason: any, promise: any) => {
  console.error("[Process Exception] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err: any) => {
  console.error("[Process Exception] Uncaught Exception thrown:", err);
});

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "bot_db.json");

app.use(express.json());

// Initialize database data defaults if missing
let botDatabase = {
  config: {
    botToken: "",
    channelUsername: "@ytx12_b",
    channelInviteLink: "https://t.me/ytx12_b",
    adDuration: 3,
    videoLimit: 10,
    resetHours: 12,
    freeChannelUrl: "https://t.me/ytx12_b",
    paidChannelUrl: "https://t.me/ytx12_b",
    price1Day: 29,
    price3Days: 59,
    price7Days: 99,
    price30Days: 299,
    baseUrl: "",
    ownerUsername: "CHAT_VIP123"
  },
  videos: [
    {
      id: "vid_free_01",
      title: "ytx12_b Free Premium Bypass Tech Video",
      description: "This free training video contains the direct setup method sourced directly from the free channel: https://t.me/ytx12_b",
      url: "https://t.me/ytx12_b/2",
      tier: "free" as const
    },
    {
      id: "vid_free_02",
      title: "ytx12_b Ultimate Free Automation Tool",
      description: "Quick setup guide, configuration, and run scripts for the free bypass tool. Sourced from: https://t.me/ytx12_b",
      url: "https://t.me/ytx12_b/5",
      tier: "free" as const
    },
    {
      id: "vid_paid_01",
      title: "👑 Paid Group VIP Masterclass Setup Video",
      description: "Exclusive paid content featuring custom and high-speed bypass methodologies. Sourced directly from current Premium Channel: https://t.me/ytx12_b",
      url: "https://t.me/ytx12_b/10",
      tier: "premium" as const
    },
    {
      id: "vid_paid_02",
      title: "👑 Paid Group Secret VIP Modding Methods",
      description: "Ultimate high-performance premium bypass modules. Available strictly for VIP users. Sourced from paid group: https://t.me/ytx12_b",
      url: "https://t.me/ytx12_b/14",
      tier: "premium" as const
    }
  ] as VideoItem[],
  users: {} as Record<string, UserSession>,
  logs: [] as LogEntry[],
  paymentRequests: [] as any[]
};

// Helper to load database
function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      botDatabase = JSON.parse(data);
      if (!botDatabase.config) botDatabase.config = {} as any;
      if (!botDatabase.config.ownerUsername) {
        (botDatabase.config as any).ownerUsername = "CHAT_VIP123";
      }
      if (!botDatabase.users) botDatabase.users = {};
      if (!botDatabase.logs) botDatabase.logs = [];
      if (!botDatabase.paymentRequests) botDatabase.paymentRequests = [];
      
      // Ensure all videos have a createdAt timestamp so they are auto-deleted properly
      if (!botDatabase.videos || !Array.isArray(botDatabase.videos) || botDatabase.videos.length === 0) {
        botDatabase.videos = [
          {
            id: "vid_free_01",
            title: "ytx12_b Free Premium Bypass Tech Video",
            description: "This free training video contains the direct setup method sourced directly from the free channel: https://t.me/ytx12_b",
            url: "https://t.me/ytx12_b/2",
            tier: "free" as const,
            createdAt: Date.now()
          },
          {
            id: "vid_free_02",
            title: "ytx12_b Ultimate Free Automation Tool",
            description: "Quick setup guide, configuration, and run scripts for the free bypass tool. Sourced from: https://t.me/ytx12_b",
            url: "https://t.me/ytx12_b/5",
            tier: "free" as const,
            createdAt: Date.now()
          },
          {
            id: "vid_paid_01",
            title: "👑 Paid Group VIP Masterclass Setup Video",
            description: "Exclusive paid content featuring custom and high-speed bypass methodologies. Sourced directly from current Premium Channel: https://t.me/ytx12_b",
            url: "https://t.me/ytx12_b/10",
            tier: "premium" as const,
            createdAt: Date.now()
          },
          {
            id: "vid_paid_02",
            title: "👑 Paid Group Secret VIP Modding Methods",
            description: "Ultimate high-performance premium bypass modules. Available strictly for VIP users. Sourced from paid group: https://t.me/ytx12_b",
            url: "https://t.me/ytx12_b/14",
            tier: "premium" as const,
            createdAt: Date.now()
          }
        ];
        saveDatabase();
      } else {
        let changed = false;
        botDatabase.videos.forEach(v => {
          const originalTitle = v.title;
          const originalDesc = v.description;
          v.title = sanitizeVideoTitle(v.title);
          v.description = sanitizeVideoDescription(v.description);
          if (v.title !== originalTitle || v.description !== originalDesc) {
            changed = true;
          }
          if (!v.createdAt) {
            v.createdAt = Date.now();
            changed = true;
          }
        });
        if (changed) {
          saveDatabase();
        }
      }
    } else {
      saveDatabase();
    }
  } catch (error) {
    console.error("Database reading error:", error);
  }
}

// Helper to save database
function saveDatabase() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(botDatabase, null, 2), "utf-8");
  } catch (error) {
    console.error("Database saving error:", error);
  }
}

// Ensure local uploads storage folder exists for physical file storage
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Auto-deletes any video that has been uploaded for more than 10 minutes
function cleanupExpiredVideos() {
  try {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    let changed = false;

    if (botDatabase.videos && Array.isArray(botDatabase.videos)) {
      const initialLength = botDatabase.videos.length;
      
      // Separate out ones that will expire so we can prune physical files
      const expired = botDatabase.videos.filter(v => {
        if (v.id.startsWith("vid_") || (v as any).isPermanent) {
          return false;
        }
        const created = v.createdAt || Date.now();
        return (now - created) >= TEN_MINUTES;
      });

      if (expired.length > 0) {
        botDatabase.videos = botDatabase.videos.filter(v => {
          if (v.id.startsWith("vid_") || (v as any).isPermanent) {
            return true;
          }
          const created = v.createdAt || Date.now();
          return (now - created) < TEN_MINUTES;
        });

        changed = true;

        expired.forEach(v => {
          insertLog("warning", `AutoDeleter daemon: Video "${v.title}" auto-deleted after 10-minutes lifespan.`);
          
          // Delete physical file if present
          if (v.url && v.url.includes("/uploads/")) {
            try {
              const fileName = v.url.split("/uploads/").pop();
              if (fileName) {
                const filePath = path.join(UPLOADS_DIR, fileName);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`Auto-deleted physical file from disk: ${filePath}`);
                }
              }
            } catch (fErr) {
              console.error("AutoDeleter failed to delete physical file:", fErr);
            }
          }
        });
      }

      if (changed) {
        saveDatabase();
      }
    }
  } catch (err) {
    console.error("Error running cleanupExpiredVideos:", err);
  }
}

// Ensure database is loaded and run initial cleanup
loadDatabase();
cleanupExpiredVideos();

// Periodically run auto-delete check every 10 seconds to delete expired video assets
setInterval(cleanupExpiredVideos, 10 * 1000);

// Track incoming server URLs to automatically detect app URL
app.use((req, res, next) => {
  if (req.headers.host) {
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const detectedUrl = `${protocol}://${req.headers.host}`;
    if (!botDatabase.config.baseUrl || botDatabase.config.baseUrl !== detectedUrl) {
      botDatabase.config.baseUrl = detectedUrl;
    }
  }
  next();
});

// Serve physical uploaded files static endpoint
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).send("File not found or has been expired and deleted automatically after 10 minutes.");
});

// Log utility
function insertLog(level: "info" | "success" | "warning" | "error", message: string) {
  const newLog: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message
  };
  botDatabase.logs.unshift(newLog);
  // Keep last 150 logs to prevent memory bloat
  if (botDatabase.logs.length > 150) {
    botDatabase.logs = botDatabase.logs.slice(0, 150);
  }
  saveDatabase();
}

// Telegram Bot instance holder
let tgBotInstance: any = null;

// Forward payment details and screenshot directly to the configured channel/group
async function forwardPaymentToGroup(reqItem: any) {
  if (!tgBotInstance) {
    insertLog("info", `Skipped Telegram forwarding for payment [${reqItem.id}]: Bot token is not configured or bot is offline.`);
    return;
  }
  const groupTarget = botDatabase.config.channelUsername || "@CHAT_VIP123";
  const captionText = `📢 <b>NEW VIP PAYMENT SUBMITTED</b> 📢\n\n` +
    `👤 <b>User Client:</b> @${reqItem.username} (ID: <code>${reqItem.userId}</code>)\n` +
    `📦 <b>Applied Plan:</b> <code>${reqItem.planName}</code>\n` +
    `💰 <b>Amount:</b> <code>₹${reqItem.cost} INR</code>\n` +
    `🕒 <b>Time Submitted:</b> <code>${new Date(reqItem.timestamp).toLocaleString()}</code>\n` +
    `🎫 <b>Ticket ID:</b> <code>${reqItem.id}</code>\n\n` +
    `⏳ <b>Access Status:</b> <code>LOCKED 🔒 (Pending Admin Verification)</code>\n\n` +
    `<i>Open the Admin Control Dashboard to manually review and approve this payment receipt.</i>`;

  try {
    if (reqItem.fileId) {
      // It's a real Telegram file ID
      await tgBotInstance.sendPhoto(groupTarget, reqItem.fileId, {
        caption: captionText,
        parse_mode: "HTML"
      });
      insertLog("success", `Forwarded payment screenshot for @${reqItem.username} (file ID: ${reqItem.fileId}) to group ${groupTarget}`);
    } else if (reqItem.screenshotUrl) {
      if (reqItem.screenshotUrl.startsWith("http")) {
        await tgBotInstance.sendPhoto(groupTarget, reqItem.screenshotUrl, {
          caption: captionText,
          parse_mode: "HTML"
        });
        insertLog("success", `Forwarded simulated photo url payment for @${reqItem.username} to group ${groupTarget}`);
      } else {
        // Safe failover for base64 uploads or placeholder data
        await tgBotInstance.sendMessage(groupTarget, captionText + `\n\n🖼️ <i>(Local file uploaded from the Simulator Dashboard)</i>`, {
          parse_mode: "HTML"
        });
        insertLog("success", `Sent simulated base64 text receipt notice of @${reqItem.username} to group ${groupTarget}`);
      }
    }
  } catch (err: any) {
    insertLog("warning", `Could not automatically forward payment receipt to group ${groupTarget}: ${err.message}. Please make sure your Bot is an active Administrator in that group with send permissions!`);
  }
}

// Function to start/restart the real Telegram bot
async function updateTelegramBot() {
  const token = botDatabase.config.botToken;
  
  // Stop existing polling
  if (tgBotInstance) {
    insertLog("info", "Stopping active Telegram Bot instance for update...");
    try {
      await tgBotInstance.stopPolling();
      tgBotInstance = null;
      insertLog("info", "Previous Telegram Bot stopped successfully.");
    } catch (err: any) {
      insertLog("error", `Error stopping Telegram Bot: ${err.message}`);
    }
  }

  if (!token || token.trim() === "" || token === "MY_TELEGRAM_BOT_TOKEN") {
    insertLog("warning", "No valid Telegram bot token provided. Operating in visual simulator mode only.");
    return;
  }

  insertLog("info", `Initializing Telegram Polling with token: ${token.substring(0, 6)}...XXXX`);
  
  try {
    tgBotInstance = new TelegramBot(token, { polling: true });
    
    // Register polling error handlers to prevent thread crash
    tgBotInstance.on("polling_error", (error: any) => {
      console.error("Telegram Polling Error:", error.message);
      insertLog("error", `Telegram Polling Connection Error: ${error.message}. Check your internet connection or bot token!`);
    });

    tgBotInstance.on("error", (error: any) => {
      console.error("Telegram General Error:", error.message);
      insertLog("error", `Telegram General Error: ${error.message}`);
    });

    // Command: /start
    tgBotInstance.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      insertLog("info", `Received /start command from Telegram user @${username} (ID: ${chatId})`);

      // Initialize or retrieve user session
      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: false,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false,
        };
        botDatabase.users[chatId.toString()] = user;
        saveDatabase();
      }

      const welcomeText = `👋 Hello @${username}!\n\nWelcome to our Video Bot service.\n\n🔒 To access video contents, you must first join our mandatory promotional updates channel:\n👉 ${botDatabase.config.channelUsername}\n\nJoin using the link below, then click "Verify Verification ✅" to unlock the "Get Video" action.`;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📢 Join Channel", url: botDatabase.config.channelInviteLink }
            ],
            [
              { text: "✅ Verify Verification", callback_data: "verify_join" }
            ],
            [
              { text: "👤 Free User", callback_data: "my_profile" }
            ]
          ]
        }
      };

      tgBotInstance?.sendMessage(chatId, welcomeText, opts).catch(err => {
        insertLog("error", `Failed sending /start reply to ${chatId}: ${err.message}`);
      });
    });

    // Command: /bulkfree - Allows forwarding 10 videos at once in free tier
    tgBotInstance.onText(/\/bulkfree/i, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      const tUsername = msg.chat.username || "";
      const tChatIdStr = msg.chat.id.toString();
      const tFromIdStr = msg.from?.id?.toString() || "";
      const isOwner = tChatIdStr === "7310228945" || tFromIdStr === "7310228945" || tUsername.toLowerCase() === (botDatabase.config.ownerUsername || "CHAT_VIP123").toLowerCase();
      
      if (!isOwner) {
        await tgBotInstance?.sendMessage(chatId, `❌ <b>Access Denied!</b>\nOnly the designated Bot Owner (@${botDatabase.config.ownerUsername}) can invoke administrative bulk configurations. Status: standard user.`, { parse_mode: "HTML" });
        return;
      }
      
      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: true,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
      }

      (user as any).bulkUploadMode = "free";
      saveDatabase();
      insertLog("success", `User @${username} activated bulk FREE video upload mode.`);
      
      await tgBotInstance?.sendMessage(chatId, "🆓 <b>Bulk FREE Upload Mode Active!</b>\n\nForward or send up to 10 video files or links now. I will immediately register them all as <b>Free Tier</b> videos inside the bot library.\n\nSend <code>/bulkoff</code> to disable bulk mode.", { parse_mode: "HTML" });
    });

    // Command: /bulkpremium - Allows forwarding 10 videos at once in premium tier
    tgBotInstance.onText(/\/bulkpremium/i, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      const tUsername = msg.chat.username || "";
      const tChatIdStr = msg.chat.id.toString();
      const tFromIdStr = msg.from?.id?.toString() || "";
      const isOwner = tChatIdStr === "7310228945" || tFromIdStr === "7310228945" || tUsername.toLowerCase() === (botDatabase.config.ownerUsername || "CHAT_VIP123").toLowerCase();
      
      if (!isOwner) {
        await tgBotInstance?.sendMessage(chatId, `❌ <b>Access Denied!</b>\nOnly the designated Bot Owner (@${botDatabase.config.ownerUsername}) can invoke administrative bulk configurations. Status: standard user.`, { parse_mode: "HTML" });
        return;
      }
      
      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: true,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
      }

      (user as any).bulkUploadMode = "premium";
      saveDatabase();
      insertLog("success", `User @${username} activated bulk PREMIUM video upload mode.`);
      
      await tgBotInstance?.sendMessage(chatId, "💎 <b>Bulk PREMIUM Upload Mode Active!</b>\n\nForward or send up to 10 video files or links now. I will immediately register them all as <b>Premium VIP</b> videos inside the bot library.\n\nSend <code>/bulkoff</code> to disable bulk mode.", { parse_mode: "HTML" });
    });

    // Command: /bulkoff - Exits bulk upload mode
    tgBotInstance.onText(/\/bulkoff/i, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      const tUsername = msg.chat.username || "";
      const tChatIdStr = msg.chat.id.toString();
      const tFromIdStr = msg.from?.id?.toString() || "";
      const isOwner = tChatIdStr === "7310228945" || tFromIdStr === "7310228945" || tUsername.toLowerCase() === (botDatabase.config.ownerUsername || "CHAT_VIP123").toLowerCase();
      
      if (!isOwner) {
        await tgBotInstance?.sendMessage(chatId, `❌ <b>Access Denied!</b>\nOnly the designated Bot Owner (@${botDatabase.config.ownerUsername}) can invoke administrative bulk configurations. Status: standard user.`, { parse_mode: "HTML" });
        return;
      }
      
      let user = botDatabase.users[chatId.toString()];
      if (user) {
        delete (user as any).bulkUploadMode;
        saveDatabase();
      }

      insertLog("info", `User @${username} deactivated bulk upload mode.`);
      await tgBotInstance?.sendMessage(chatId, "✅ <b>Bulk upload mode disabled.</b> Returning to standard interaction.", { parse_mode: "HTML" });
    });

    // Command: /paid_user (Supports: /paid_user get_video bot_upload)
    tgBotInstance.onText(/\/paid_user(?:_get_video_bot_upload)?|^\/paid_user(?:\s+get_video\s+bot_upload)?/i, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      insertLog("info", `Received /paid_user command from @${username}`);

      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: false,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
        saveDatabase();
      }

      if (!user.isPremium) {
        const errorMsg = `❌ <b>Access Denied</b>\n\nThe command <code>/paid_user get_video bot_upload</code> is reserved for <b>VIP Premium Members</b> only.\n\n👑 <b>VIP Premium Perks:</b>\n- Directly access premium videos\n- No ads or waiting delays\n- Sequential video navigation (Next/Prev)\n\n💳 Press "Upgrade to Premium" below to unlock simulated VIP access instantly!`;
        const opts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 Upgrade to Premium", callback_data: "get_premium" }],
              [{ text: "🔙 Main Menu", callback_data: "my_profile" }]
            ]
          }
        };
        await tgBotInstance?.sendMessage(chatId, errorMsg, opts);
        return;
      }

      // Serve starting premium video
      user.currentVideoIndex = 0;
      saveDatabase();
      await serveVideoByIndex(chatId, username, true, 0);
    });

    // Command: /free_user (Supports: /free_user get_video bot_upload)
    tgBotInstance.onText(/\/free_user(?:_get_video_bot_upload)?|^\/free_user(?:\s+get_video\s+bot_upload)?/i, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      insertLog("info", `Received /free_user command from @${username}`);

      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: false,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
        saveDatabase();
      }

      if (!user.isVerified) {
        const joinMsg = `🔒 <b>Verification Required</b>\n\nTo fetch free videos, please join our channel and verify first:\n👉 ${botDatabase.config.channelUsername}`;
        const opts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Join Channel", url: botDatabase.config.channelInviteLink }],
              [{ text: "✅ Verify Verification", callback_data: "verify_join" }]
            ]
          }
        };
        await tgBotInstance?.sendMessage(chatId, joinMsg, opts);
        return;
      }

      const resetTime = new Date(user.resetAt);
      if (user.videoLimitUsed >= botDatabase.config.videoLimit) {
        const limitsExceededMsg = `❌ <b>Remaining Free limit: 0/10.</b>\n\nYour limit resets automatically soon.\n\n👑 Buy Premium for instant, unlimited downloads and ads-free delivery!`;
        const limitOpts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 Upgrade to Premium", callback_data: "get_premium" }],
              [{ text: "👤 View Profile", callback_data: "my_profile" }]
            ]
          }
        };
        await tgBotInstance?.sendMessage(chatId, limitsExceededMsg, limitOpts);
        return;
      }

      // Show Sponsor Ad then serve free videos
      const adMsg = await tgBotInstance?.sendMessage(chatId, `📺 <b>[Sponsor Ad]</b>\nPlease wait ${botDatabase.config.adDuration} seconds while we fetch the latest video.\nAd presented by @CHAT_VIP123.`, { parse_mode: "HTML" });
      
      setTimeout(async () => {
        try {
          if (adMsg) {
            await tgBotInstance?.deleteMessage(chatId, adMsg.message_id);
          }
          user.videoLimitUsed += 1;
          user.currentVideoIndex = 0;
          saveDatabase();
          await serveVideoByIndex(chatId, username, false, 0);
        } catch (err) {
          console.error("Ad error for free command:", err);
        }
      }, botDatabase.config.adDuration * 1000);
    });

    // Command: /addvideo or /upload (Supports format: /addvideo [free/premium] | [title] | [url] | [description])
    tgBotInstance.onText(/^\/(addvideo|upload)(?:\s+([\s\S]+))?/i, async (msg, match) => {
      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";
      const argString = match ? match[2] : "";
      
      const tUsername = msg.chat.username || "";
      const tChatIdStr = msg.chat.id.toString();
      const tFromIdStr = msg.from?.id?.toString() || "";
      const isOwner = tChatIdStr === "7310228945" || tFromIdStr === "7310228945" || tUsername.toLowerCase() === (botDatabase.config.ownerUsername || "CHAT_VIP123").toLowerCase();
      
      if (!isOwner) {
        await tgBotInstance?.sendMessage(chatId, `❌ <b>Access Denied!</b>\nOnly the designated Bot Owner (@${botDatabase.config.ownerUsername}) represents administrative credentials to add videos to the bot library.`, { parse_mode: "HTML" });
        return;
      }

      if (!argString || argString.trim() === "") {
        const helpText = `💡 <b>How to upload/add a video to the Bot directly:</b>\n\n` +
          `Please provide the details in one of the following formats:\n\n` +
          `<b>Format A (With Pipes):</b>\n` +
          `<code>/addvideo &lt;tier&gt; | &lt;title&gt; | &lt;url&gt; | &lt;description&gt;</code>\n\n` +
          `<b>Example:</b>\n` +
          `<code>/addvideo premium | VIP Bypass Guide | https://t.me/ytx12_b/10 | Exclusive bypass method.</code>\n\n` +
          `<b>Format B (Detect Link directly):</b>\n` +
          `Simply paste/send any channel post link (e.g. <code>https://t.me/ytx12_b/5</code>) directly to the bot and we'll prompt you to save it!`;
        const opts = { parse_mode: "HTML" as const };
        await tgBotInstance?.sendMessage(chatId, helpText, opts);
        return;
      }

      insertLog("info", `User @${username} attempting to upload a video via command...`);

      let tier: "free" | "premium" = "free";
      let title = "";
      let url = "";
      let description = "";

      if (argString.includes("|")) {
        const parts = argString.split("|").map(p => p.trim());
        const tierInput = parts[0]?.toLowerCase();
        tier = (tierInput === "premium" || tierInput === "vip") ? "premium" : "free";
        title = parts[1] || "Uploaded Channel Video";
        url = parts[2] || "";
        description = parts[3] || "Uploaded directly via Telegram channel.";
      } else {
        const parts = argString.split(/\s+/);
        const tierInput = parts[0]?.toLowerCase();
        tier = (tierInput === "premium" || tierInput === "vip") ? "premium" : "free";
        
        const urlIndex = parts.findIndex(p => p.startsWith("http://") || p.startsWith("https://") || p.includes("t.me/"));
        if (urlIndex !== -1) {
          url = parts[urlIndex];
          title = parts.slice(1, urlIndex).join(" ") || "Uploaded Channel Video";
          description = parts.slice(urlIndex + 1).join(" ") || "Uploaded directly via Telegram channel.";
        }
      }

      if (!url || url.trim() === "") {
        await tgBotInstance?.sendMessage(chatId, "❌ <b>Upload Error:</b> Direct link/URL is missing. Please provide a valid download/post link.", { parse_mode: "HTML" });
        return;
      }

      const newVideoId = `vid_${tier}_${Date.now()}`;
      const newVideo: VideoItem = {
        id: newVideoId,
        title: sanitizeVideoTitle(title || `Uploaded Video #${botDatabase.videos.length + 1}`),
        description: sanitizeVideoDescription(description || "No description provided."),
        url: url,
        tier: tier,
        createdAt: Date.now()
      };

      botDatabase.videos.push(newVideo);
      saveDatabase();
      insertLog("success", `Video Uploaded: Specified as [${tier.toUpperCase()}] "${newVideo.title}" via command`);

      const successMsg = `✅ <b>Successfully Registered Video inside Bot!</b>\n\n` +
        `📝 <b>Title:</b> ${escapeHtml(newVideo.title)}\n` +
        `👑 <b>Tier:</b> ${tier === "premium" ? "Premium 💎" : "Free Tier 🆓"}\n` +
        `🔗 <b>URL/Source:</b> <code>${escapeHtml(newVideo.url)}</code>\n` +
        `ℹ️ <b>Description:</b> ${escapeHtml(newVideo.description)}\n\n` +
        `🍿 The movie is now immediately playable in the bot library and the live preview dashboard tab!`;

      await tgBotInstance?.sendMessage(chatId, successMsg, { parse_mode: "HTML" });
    });

    // Match messages that are NOT commands but contain telegram or other post URLs or files
    tgBotInstance.on("message", async (msg) => {
      // Avoid parsing commands
      if (msg.text && msg.text.startsWith("/")) return;

      const chatId = msg.chat.id;
      const username = msg.chat.username || msg.chat.first_name || "User";

      // Initialize or retrieve user session
      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: false,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
        saveDatabase();
      }

      // Check for payment receipt screenshot pictures
      const isPhotoAttachment = msg.photo && msg.photo.length > 0;
      const isImageDoc = msg.document && msg.document.mime_type?.startsWith("image/");
      if (isPhotoAttachment || isImageDoc) {
        const fileId = isPhotoAttachment 
          ? msg.photo![msg.photo!.length - 1].file_id 
          : msg.document!.file_id;

        const planName = (user as any).checkoutPlanName || "1 Day VIP Plan";
        const costVal = (user as any).checkoutCost || botDatabase.config.price1Day || 29;
        const planDays = (user as any).checkoutDays || 1;

        const newRequest = {
          id: "req_" + Math.random().toString(36).substr(2, 9),
          userId: chatId,
          username: username,
          planName: planName,
          cost: costVal,
          status: "pending" as const,
          timestamp: new Date().toISOString(),
          fileId: fileId,
          days: planDays
        };

        if (!botDatabase.paymentRequests) botDatabase.paymentRequests = [];
        botDatabase.paymentRequests.push(newRequest);

        // Clear user active checkout
        delete (user as any).checkoutPlan;
        delete (user as any).checkoutPlanName;
        delete (user as any).checkoutCost;
        delete (user as any).checkoutDays;
        saveDatabase();

        insertLog("success", `Payment Screenshot Received: USER @${username} submitted receipt for ${planName} (₹${costVal})`);

        // Forward screenshot to Group instantly
        await forwardPaymentToGroup(newRequest);

        const confirmationText = `📨 <b>Payment Screenshot Received!</b>\n\n` +
          `📦 <b>Submitting Plan:</b> <code>${escapeHtml(planName)}</code>\n` +
          `💰 <b>Amount Unpaid:</b> <code>₹${costVal}</code>\n` +
          `⏱️ <b>Status:</b> <code>PENDING ADMIN REVIEW ⏳</code>\n\n` +
          `Your payment receipt has been sent safely to Owner/Admin <b>@CHAT_VIP123</b> for manual verification. Your account will automatically receive active Premium perks once confirmed! Thank you.`;

        await tgBotInstance?.sendMessage(chatId, confirmationText, { parse_mode: "HTML" });
        return;
      }

      let detectedUrl = "";
      let detectedTitle = "";

      // 1. Detect if it contains an actual Telegram video file attachment
      if (msg.video) {
        detectedUrl = `file_id:${msg.video.file_id}`;
        detectedTitle = sanitizeVideoTitle(msg.caption || `Uploaded Telegram Video (${msg.video.file_name || "Untitled"})`);
      }
      // 2. Detect if it contains a document file that is a video
      else if (msg.document && msg.document.mime_type?.startsWith("video/")) {
        detectedUrl = `file_id:${msg.document.file_id}`;
        detectedTitle = sanitizeVideoTitle(msg.caption || msg.document.file_name || "Uploaded Document Video");
      }
      // 3. Detect if it has text with a link (t.me, telegram links, or http/https)
      else if (msg.text) {
        const tgUrlRegex = /(https?:\/\/[^\s]+)/gi;
        const match = tgUrlRegex.exec(msg.text);
        if (match) {
          detectedUrl = match[1];
          detectedTitle = "Channel Link Video";
        }
      }
      // 4. Detect if it has a caption with a link (e.g. video post with text)
      else if (msg.caption) {
        const tgUrlRegex = /(https?:\/\/[^\s]+)/gi;
        const match = tgUrlRegex.exec(msg.caption);
        if (match) {
          detectedUrl = match[1];
          detectedTitle = sanitizeVideoTitle(msg.caption.slice(0, 60) || "Caption Link Video");
        }
      }

      if (detectedUrl) {
        const tUsername = msg.chat.username || "";
        const tChatIdStr = msg.chat.id.toString();
        const tFromIdStr = msg.from?.id?.toString() || "";
        const isOwner = tChatIdStr === "7310228945" || tFromIdStr === "7310228945" || tUsername.toLowerCase() === (botDatabase.config.ownerUsername || "CHAT_VIP123").toLowerCase();
        
        if (!isOwner) {
          return;
        }

        insertLog("info", `Detected prospective video asset from user @${username}: ${detectedUrl}`);

        let user = botDatabase.users[chatId.toString()];
        if (!user) {
          user = {
            userId: chatId,
            username: username,
            isVerified: false,
            videoLimitUsed: 0,
            resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
            isPremium: false
          };
          botDatabase.users[chatId.toString()] = user;
        }

        // Automatic Auto-Save when Bulk Upload Mode is Active
        if ((user as any).bulkUploadMode) {
          const tier = (user as any).bulkUploadMode;
          const newVideoId = `vid_${tier}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const newVideo: VideoItem = {
            id: newVideoId,
            title: detectedTitle || `Bulk Forward Video #${botDatabase.videos.length + 1}`,
            description: `Auto-registered via Telegram Bulk Forwarding Mode: ${detectedUrl}`,
            url: detectedUrl,
            tier: tier,
            createdAt: Date.now()
          };

          botDatabase.videos.push(newVideo);
          saveDatabase();
          insertLog("success", `Bulk Saved: Automatically registered [${tier.toUpperCase()}] "${newVideo.title}" via Telegram stream.`);
          
          await tgBotInstance?.sendMessage(chatId, `✅ <b>Registered Video #${botDatabase.videos.length}</b>\n\n🎬 <b>Title:</b> <code>${escapeHtml(newVideo.title)}</code>\n👑 <b>Classification:</b> ${tier === "premium" ? "Premium 💎" : "Free Tier 🆓"}`, { parse_mode: "HTML" });
          return;
        }

        user.pendingUploadUrl = detectedUrl;
        user.pendingUploadTitle = detectedTitle;
        saveDatabase();

        const detectedText = `📥 <b>Direct Video Upload Detection</b>\n\n` +
          `I detected you sent or forwarded a video/link:\n` +
          `🎬 <b>Default Title:</b> <i>${escapeHtml(detectedTitle)}</i>\n` +
          `🔗 <b>Source/File ID:</b> <code>${escapeHtml(detectedUrl)}</code>\n\n` +
          `Would you like to directly register/upload this video into the bot library? Choose the classification below:`;

        const opts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🆓 Upload as FREE Video", callback_data: "save_direct_free" },
                { text: "💎 Upload as PREMIUM Video", callback_data: "save_direct_premium" }
              ],
              [
                { text: "❌ Cancel Upload", callback_data: "save_direct_cancel" }
              ]
            ]
          }
        };

        await tgBotInstance?.sendMessage(chatId, detectedText, opts);
      }
    });

    // Handle Inline Keyboards Actions
    tgBotInstance.on("callback_query", async (callbackQuery) => {
      const msg = callbackQuery.message;
      if (!msg) return;
      const chatId = msg.chat.id;
      const data = callbackQuery.data;
      const callbackQueryId = callbackQuery.id;
      const username = msg.chat.username || msg.chat.first_name || "User";

      // Initialize or retrieve session
      let user = botDatabase.users[chatId.toString()];
      if (!user) {
        user = {
          userId: chatId,
          username: username,
          isVerified: false,
          videoLimitUsed: 0,
          resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
          isPremium: false
        };
        botDatabase.users[chatId.toString()] = user;
        saveDatabase();
      }

      // Inline action: Premium VIP video selection query
      if (data === "get_premium_video") {
        insertLog("info", `User @${username} requested Premium / VIP Video content.`);
        if (!user.isPremium) {
          const buyMsg = `❌ <b>Premium VIP Access Denied</b>\n\nThis video series is reserved for premium VIP users only!\n\nPlease upgrade to a Premium plan to unlock streaming & downloading rights directly in this bot.`;
          await tgBotInstance?.sendMessage(chatId, buyMsg, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "💎 Upgrade to Premium", callback_data: "get_premium" }],
                [{ text: "👤 View Profile Status", callback_data: "my_profile" }]
              ]
            }
          });
          await tgBotInstance?.answerCallbackQuery(callbackQueryId);
          return;
        }
        await serveVideoByIndex(chatId, username, true, 0, callbackQueryId);
        return;
      }

      // Inline action: Direct file download attachment stream
      if (data && data.startsWith("download_vid_")) {
        const vidId = data.slice("download_vid_".length);
        const appropriateVid = botDatabase.videos.find(v => v.id === vidId);

        if (!appropriateVid) {
          await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "❌ Video element not found!", show_alert: true });
          return;
        }

        // Lock check
        if (appropriateVid.tier === "premium" && !user.isPremium) {
          await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "❌ VIP Download Denied! Please get Premium VIP status.", show_alert: true });
          return;
        }

        await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "📥 Downloading video direct into Bot chat...", show_alert: false });
        await tgBotInstance?.sendMessage(chatId, `⏳ Connecting bypass channel... Downloading <b>${escapeHtml(appropriateVid.title)}</b> directly into this chat thread. Please wait...`, { parse_mode: "HTML" });

        try {
          const isDirectTelegramFile = !appropriateVid.url.startsWith("http") && (appropriateVid.url.startsWith("file_id:") || appropriateVid.url.match(/^[a-zA-Z0-9_\-]{30,}$/));
          if (isDirectTelegramFile) {
            let fileIdToSend = appropriateVid.url;
            if (fileIdToSend.startsWith("file_id:")) {
              fileIdToSend = fileIdToSend.slice("file_id:".length);
            }
            await tgBotInstance?.sendVideo(chatId, fileIdToSend, {
              caption: `📥 <b>Direct download:</b> ${escapeHtml(appropriateVid.title)}`,
              parse_mode: "HTML"
            });
          } else {
            await tgBotInstance?.sendVideo(chatId, appropriateVid.url, {
              caption: `📥 <b>Direct download:</b> ${escapeHtml(appropriateVid.title)}`,
              parse_mode: "HTML"
            });
          }
          insertLog("success", `Directly sent video file "${appropriateVid.title}" to user @${username} chat.`);
        } catch (mediaErr: any) {
          insertLog("warning", `Attachment failed, serving absolute direct bypass link: ${mediaErr.message}`);
          await tgBotInstance?.sendMessage(chatId, `✅ <b>Secure Download Link Ready:</b>\n\n🎯 <a href="${escapeHtml(appropriateVid.url)}">Click here to immediately download ${escapeHtml(appropriateVid.title)}</a>`, { parse_mode: "HTML" });
        }
        return;
      }

      if (data === "save_direct_free" || data === "save_direct_premium") {
        const tier = data === "save_direct_premium" ? "premium" : "free";
        const urlToSave = user.pendingUploadUrl;
        const titleToSave = sanitizeVideoTitle(user.pendingUploadTitle || `Channel Upload Video #${botDatabase.videos.length + 1}`);

        if (!urlToSave) {
          await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "❌ Session expired or link not found! Please send again.", show_alert: true });
          return;
        }

        const newVideoId = `vid_${tier}_${Date.now()}`;
        const newVideo: VideoItem = {
          id: newVideoId,
          title: titleToSave,
          description: `Directly registered from Telegram channel: ${urlToSave}`,
          url: urlToSave,
          tier: tier,
          createdAt: Date.now()
        };

        botDatabase.videos.push(newVideo);
        delete user.pendingUploadUrl;
        delete user.pendingUploadTitle;
        saveDatabase();

        insertLog("success", `Direct Upload Saved: Added video #${botDatabase.videos.length} [${tier.toUpperCase()}] titled "${titleToSave}"`);

        await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "Saved successfully! ✅", show_alert: false });

        const savedMsg = `✅ <b>Successfully Registered Video inside Bot Library!</b>\n\n` +
          `📝 <b>Title:</b> <i>${escapeHtml(titleToSave)}</i>\n` +
          `👑 <b>Tier:</b> ${tier === "premium" ? "Premium 💎" : "Free Tier 🆓"}\n` +
          `🔗 <b>URL/Source:</b> <code>${escapeHtml(urlToSave)}</code>\n\n` +
          `🍿 Now playable directly in the bot lists for everyone!`;

        await tgBotInstance?.sendMessage(chatId, savedMsg, { parse_mode: "HTML" });
        return;
      }

      else if (data === "save_direct_cancel") {
        delete user.pendingUploadUrl;
        delete user.pendingUploadTitle;
        saveDatabase();
        await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "Upload Canceled ❌", show_alert: false });
        await tgBotInstance?.sendMessage(chatId, "❌ Direct upload cancelled. Your pending session is cleared.");
        return;
      }

      else if (data === "verify_join") {
        insertLog("info", `Verifying membership for user @${username} (ID: ${chatId}) in ${botDatabase.config.channelUsername}`);
        
        try {
          // Attempt real check on Telegram
          // Wait: getChatMember expects a channel username starting with @ or channel chat id
          const targetChan = botDatabase.config.channelUsername;
          let isJoined = false;

          try {
            const member = await tgBotInstance!.getChatMember(targetChan, chatId);
            const status = member.status;
            // member status can be creator, administrator, member, restricted, left, kicked
            isJoined = ["creator", "administrator", "member", "restricted"].includes(status);
          } catch (apiErr: any) {
            insertLog("warning", `Real-time channel check for @${username} failed: ${apiErr.message}. Defaulting to verification success for demonstration/flexibility.`);
            // If API fails (e.g. because bot is not admin in that channel yet) we gracefully fall back to positive response for sandbox setup
            isJoined = true;
          }

          if (isJoined) {
            user.isVerified = true;
            saveDatabase();
            insertLog("success", `User @${username} (ID: ${chatId}) verified successfully in channel!`);
            
            await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "Successfully Verified! 🎉", show_alert: true });
            
            const mainText = `🎉 Successfully verified!\n\nYou now have full permission to retrieve video guides.\n\n👑 Plan Status: ${user.isPremium ? "Premium 💎 (Ad-Free)" : "Free 🎬 (With Ads)"}\n⚡ Free Limits Remaining: ${Math.max(0, botDatabase.config.videoLimit - user.videoLimitUsed)}/10\n\nChoose an action below:`;
            
            const mainOpts = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "🎬 Free Videos", callback_data: "get_video" }
                  ],
                  [
                    { text: "💎 Premium Videos", callback_data: "get_premium_video" }
                  ],
                  [
                    { text: "👤 Free User", callback_data: "my_profile" },
                    { text: "💎 Get Premium", callback_data: "get_premium" }
                  ]
                ]
              }
            };
            
            await tgBotInstance?.sendMessage(chatId, mainText, mainOpts);
          } else {
            insertLog("warning", `User @${username} is NOT a member of ${botDatabase.config.channelUsername}`);
            await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "❌ You have not joined the channel yet! Please join and try again.", show_alert: true });
          }
        } catch (err: any) {
          console.error("Error verifying join callback:", err);
        }
      }

      else if (data === "get_video") {
        insertLog("info", `User @${username} clicked "Get Video"`);

        // Force check verification
        if (!user.isVerified) {
          await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "⚠️ Please click 'Verify Verification' first!", show_alert: true });
          return;
        }

        // Automatic reset of limits if 12 hours passed
        const now = new Date();
        const resetTime = new Date(user.resetAt);
        if (now > resetTime) {
          user.videoLimitUsed = 0;
          user.resetAt = new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString();
          saveDatabase();
          insertLog("info", `Auto-renewing limits for user @${username}: Limit reset.`);
        }

        // Premium Flow: Instant video serving
        if (user.isPremium) {
          await serveVideoByIndex(chatId, username, true, 0, callbackQueryId);
        } else {
          // Free Flow: Check limits, then show custom ad timer!
          if (user.videoLimitUsed >= botDatabase.config.videoLimit) {
            insertLog("warning", `Free user @${username} bypassed/requested video but reached standard 10-limit.`);
            const limitsExceededMsg = `❌ Remaining Free limit: 0/10.\n\nYour limit resets automatically at:\n🕒 ${resetTime.toLocaleString()}\n\n👑 Buy Premium for instant, unlimited downloads & no ads! Press "Get Premium 💎" below.`;
            
            const limitOpts = {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💎 Upgrade to Premium", callback_data: "get_premium" }],
                  [{ text: "👤 View Profile", callback_data: "my_profile" }]
                ]
              }
            };
            await tgBotInstance?.sendMessage(chatId, limitsExceededMsg, limitOpts);
            await tgBotInstance?.answerCallbackQuery(callbackQueryId);
            return;
          }

          // Show Ad Countdown (2-3s)
          await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: "⏳ Loading video... Watching Sponsor Ad (3 Seconds)", show_alert: false });
          
          const adMsg = await tgBotInstance?.sendMessage(chatId, `📺 [Sponsor Ad]\n🤖 Please support our sponsors by looking at this ad for ${botDatabase.config.adDuration} seconds.\n🔑 Ad credit provided by Telegram Channel @CHAT_VIP123.`);
          
          insertLog("info", `Displaying simulated ${botDatabase.config.adDuration}s ad to user @${username}...`);

          setTimeout(async () => {
            try {
              // Delete ad message & serve video
              if (adMsg) {
                await tgBotInstance?.deleteMessage(chatId, adMsg.message_id);
              }
              user.videoLimitUsed += 1;
              // Reset browsed index to start for fresh request
              user.currentVideoIndex = 0;
              saveDatabase();
              await serveVideoByIndex(chatId, username, false, 0, callbackQueryId);
            } catch (err) {
              console.error("Ad dismissal error:", err);
            }
          }, botDatabase.config.adDuration * 1000);
        }
      }

      else if (data === "my_profile") {
        insertLog("info", `User @${username} requested profile status.`);
        
        const now = new Date();
        const resetTime = new Date(user.resetAt);
        let timeRemainingStr = "0h 0m";
        if (resetTime > now) {
          const diffMs = resetTime.getTime() - now.getTime();
          const hours = Math.floor(diffMs / (60 * 60 * 1000));
          const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
          timeRemainingStr = `${hours}h ${mins}m`;
        }

        const profileText = `👤 <b>Your User Profile</b>\n\n` +
          `• Telegram ID: <code>${chatId}</code>\n` +
          `• Username: @${escapeHtml(username)}\n` +
          `• Verified Status: ${user.isVerified ? "✅ Verified" : "❌ Unverified"}\n` +
          `• Account Type: ${user.isPremium ? "💎 PREMIUM (Ad-Free)" : "🆓 Free Tier (With Ads)"}\n\n` +
          `${user.isPremium ? "✨ Enjoy unlimited ad-free premium videos!" : `• Free Limit Used: ${user.videoLimitUsed}/${botDatabase.config.videoLimit}\n• Automatic Reset In: ${timeRemainingStr}\n`}`;

        const profOpts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎬 Get Video", callback_data: "get_video" }],
              user.isPremium ? [] : [{ text: "💎 Upgrade to Premium", callback_data: "get_premium" }]
            ].filter(r => r.length > 0)
          }
        };

        await tgBotInstance?.sendMessage(chatId, profileText, profOpts);
        await tgBotInstance?.answerCallbackQuery(callbackQueryId);
      }

      else if (data === "get_premium") {
        insertLog("info", `User @${username} requested Upgrade to Premium.`);
        
        const rateText = `💎 <b>Upgrade to PREMIUM Membership (VIP TIER)</b>\n\n` +
          `🔥 Remove ads and enjoy unlimited video downloads instantly, 24/7!\n\n` +
          `👑 <b>Premium Extras:</b>\n` +
          `- No annoying ads/waiting screens.\n` +
          `- Infinite VIP requests (No daily download limits).\n` +
          `- Exclusive premium videos directly from paid VIP group!\n\n` +
          `💵 <b>Select Premium Plan (Indian Rupees - INR):</b>\n` +
          `1️⃣ <b>1 Day Plan:</b> ₹${botDatabase.config.price1Day || 29}\n` +
          `2️⃣ <b>3 Days Plan:</b> ₹${botDatabase.config.price3Days || 59}\n` +
          `3️⃣ <b>7 Days Plan:</b> ₹${botDatabase.config.price7Days || 99}\n` +
          `4️⃣ <b>30 Days Plan (Monthly):</b> ₹${botDatabase.config.price30Days || 299}\n\n` +
          `💳 Contact admin on Telegram to purchase:\n` +
          `💌 <b>Support Contact:</b> @CHAT_VIP123\n` +
          `🌐 <b>VIP Group Link:</b> ${escapeHtml(botDatabase.config.paidChannelUrl || 'https://t.me/ytx12_b')}\n\n` +
          `Select a plan below to test simulation instantly:`;
        
        const premOpts = {
          parse_mode: "HTML" as const,
          reply_markup: {
            inline_keyboard: [
              [
                { text: `💳 1 Day Plan (₹${botDatabase.config.price1Day || 29})`, callback_data: "simulate_payment_1d" },
                { text: `💳 3 Days Plan (₹${botDatabase.config.price3Days || 59})`, callback_data: "simulate_payment_3d" }
              ],
              [
                { text: `💳 7 Days Plan (₹${botDatabase.config.price7Days || 99})`, callback_data: "simulate_payment_7d" },
                { text: `💳 Monthly Plan (₹${botDatabase.config.price30Days || 299})`, callback_data: "simulate_payment_30d" }
              ],
              [
                { text: "🤝 Contact Support Admin", url: botDatabase.config.channelInviteLink }
              ]
            ]
          }
        };

        await tgBotInstance?.sendMessage(chatId, rateText, premOpts);
        await tgBotInstance?.answerCallbackQuery(callbackQueryId);
      }

      else if (data.startsWith("simulate_payment_")) {
        const plan = data.split("_")[2]; // "1d", "3d", "7d", "30d"
        let days = 1;
        let planName = "1 Day Plan";
        let cost = botDatabase.config.price1Day || 29;
        
        if (plan === "3d") {
          days = 3;
          planName = "3 Days Plan";
          cost = botDatabase.config.price3Days || 59;
        } else if (plan === "7d") {
          days = 7;
          planName = "7 Days Plan";
          cost = botDatabase.config.price7Days || 99;
        } else if (plan === "30d") {
          days = 30;
          planName = "30 Days Plan (Monthly)";
          cost = botDatabase.config.price30Days || 299;
        }

        // Save active checkout details so we verify their pending screenshot receipt for this specific order
        (user as any).checkoutPlan = plan;
        (user as any).checkoutPlanName = planName;
        (user as any).checkoutCost = cost;
        (user as any).checkoutDays = days;
        saveDatabase();

        insertLog("info", `User @${username} initiated checkout for ${planName} (₹${cost}). Requesting payment screenshot.`);

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=upi://pay?pa=mddilmohamad01@ybl%26pn=Canara%26am=${cost}%26tn=Premium%20Bypass`;

        const paymentGatewayText = `💳 <b>PAYMENT GATEWAY - UPI QR CODE</b>\n\n` +
          `Scan the QR Code below to pay instant ₹<b>${cost}</b> via PhonePe, GPay, Paytm, or any UPI app:\n\n` +
          `🏦 <b>Bank Name:</b> Canara Bank - 4075\n` +
          `🔑 <b>UPI Address:</b> <code>mddilmohamad01@ybl</code>\n` +
          `💸 <b>Price Plan:</b> ${planName} (₹${cost})\n\n` +
          `🖼️ <b>QR Image:</b> <a href="${qrUrl}">Direct QR Link</a>\n\n` +
          `📌 <b>IMPORTANT (manual verification):</b>\n` +
          `After completing your payment, please <b>directly send or upload a screenshot of your successful transaction receipt</b> to this bot right now.\n\n` +
          `Once received, the Owner/Admin @CHAT_VIP123 will instantly verify your screenshot and activate your VIP Access! ⚡`;

        await tgBotInstance?.answerCallbackQuery(callbackQueryId, { text: `Initiated ₹${cost} VIP payment!`, show_alert: false });

        // If possible, try sending as a photo, else send as message
        try {
          await tgBotInstance?.sendPhoto(chatId, qrUrl, {
            caption: paymentGatewayText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🤝 Support & Verification Chat", url: botDatabase.config.channelInviteLink }],
                [{ text: "🔙 main Profile Status", callback_data: "my_profile" }]
              ]
            }
          });
        } catch (photoErr) {
          // Fallback to text message
          await tgBotInstance?.sendMessage(chatId, paymentGatewayText + `\n\n👉 UPI QR Code Image: ${qrUrl}`, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🤝 Support & Verification Chat", url: botDatabase.config.channelInviteLink }],
                [{ text: "🔙 main Profile Status", callback_data: "my_profile" }]
              ]
            }
          });
        }
      }
      else if (data === "next_vid" || data.startsWith("next_vid_")) {
        await serveVideoByIndex(chatId, username, user.isPremium, 1, callbackQueryId);
      }
      else if (data === "prev_vid" || data.startsWith("prev_vid_")) {
        await serveVideoByIndex(chatId, username, user.isPremium, -1, callbackQueryId);
      }
      else if (data === "random_vid") {
        const userTier = user.isPremium ? "premium" : "free";
        let filteredVids = botDatabase.videos.filter(v => v.tier === userTier);
        if (filteredVids.length === 0) filteredVids = botDatabase.videos;
        if (filteredVids.length > 0) {
          user.currentVideoIndex = Math.floor(Math.random() * filteredVids.length);
          saveDatabase();
        }
        await serveVideoByIndex(chatId, username, user.isPremium, 0, callbackQueryId);
      }
    });

    insertLog("success", `Telegram Bot online! Bot is actively listening for updates on Telegram...`);
  } catch (err: any) {
    insertLog("error", `Failed starting Telegram Bot: ${err.message}`);
    console.error(err);
  }
}

// Serve video by relative or direct index with navigation commands
async function serveVideoByIndex(chatId: string | number, username: string, isPremium: boolean, indexChange: number, callbackQueryId?: string) {
  const userTier = isPremium ? "premium" : "free";
  let filteredVids = botDatabase.videos.filter(v => v.tier === userTier);
  
  if (filteredVids.length === 0) {
    if (isPremium) {
      filteredVids = botDatabase.videos;
    } else {
      filteredVids = botDatabase.videos.filter(v => v.tier === "free");
    }
  }

  if (filteredVids.length === 0) {
    const emptyMsg = isPremium 
      ? "⚠️ Sorry, there are currently no Premium videos uploaded in the library by the admin! Please check back later."
      : "⚠️ Sorry, there are currently no Free videos uploaded in the library by the admin! Please check back later.";
    await tgBotInstance?.sendMessage(chatId, emptyMsg);
    if (callbackQueryId) {
      await tgBotInstance?.answerCallbackQuery(callbackQueryId);
    }
    return;
  }

  let user = botDatabase.users[chatId.toString()];
  if (!user) {
    user = {
      userId: chatId,
      username: username,
      isVerified: true,
      videoLimitUsed: 0,
      resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
      isPremium: isPremium
    };
    botDatabase.users[chatId.toString()] = user;
  }

  // Calculate new index
  let currentIndex = user.currentVideoIndex !== undefined ? user.currentVideoIndex : 0;
  currentIndex = currentIndex + indexChange;

  // Wrap index
  if (currentIndex < 0) {
    currentIndex = filteredVids.length - 1;
  } else if (currentIndex >= filteredVids.length) {
    currentIndex = 0;
  }

  // Save index back to database
  user.currentVideoIndex = currentIndex;
  saveDatabase();

  const selectedVid = filteredVids[currentIndex];
  
  // Clean caption: Just write title & description below the video, avoiding all channel premium links or promotional text.
  const videoDetails = `🎬 <b>${escapeHtml(selectedVid.title)}</b>\n\n` +
    `ℹ️ ${escapeHtml(selectedVid.description || "No description provided.")}`;

  const keyboardOpts = {
    parse_mode: "HTML" as const,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⏮️ Prev Video", callback_data: `prev_vid_${currentIndex}` },
          { text: "⏭️ Next Video", callback_data: `next_vid_${currentIndex}` }
        ],
        [
          { text: "📥 Download Video directly in Bot", callback_data: `download_vid_${selectedVid.id}` }
        ],
        [
          { text: "🎰 Get Random Video", callback_data: "random_vid" },
          { text: "🔙 Main Menu", callback_data: "my_profile" }
        ]
      ]
    }
  };

  // Check if it is a native Telegram file ID
  const isDirectTelegramFile = !selectedVid.url.startsWith("http") && (selectedVid.url.startsWith("file_id:") || selectedVid.url.match(/^[a-zA-Z0-9_\-]{30,}$/));

  if (isDirectTelegramFile) {
    let fileIdToSend = selectedVid.url;
    if (fileIdToSend.startsWith("file_id:")) {
      fileIdToSend = fileIdToSend.slice("file_id:".length);
    }
    
    try {
      insertLog("info", `Attempting to stream native Telegram file_id direct video: ${fileIdToSend}`);
      await tgBotInstance?.sendVideo(chatId, fileIdToSend, {
        caption: videoDetails,
        parse_mode: "HTML",
        reply_markup: keyboardOpts.reply_markup
      });
    } catch (err: any) {
      insertLog("warning", `Error sending direct file_id ${fileIdToSend}: ${err.message}. Falling back to descriptive menu.`);
      await tgBotInstance?.sendMessage(chatId, videoDetails, keyboardOpts);
    }
  } else {
    await tgBotInstance?.sendMessage(chatId, videoDetails, keyboardOpts);
  }
  if (callbackQueryId) {
    await tgBotInstance?.answerCallbackQuery(callbackQueryId);
  }
  insertLog("success", `Served ${userTier} tier video index ${currentIndex} ("${selectedVid.title}") to user @${username}`);
}

// Trigger initial bot start if token available in DB
updateTelegramBot();

// API Endpoints
// Load configuration
app.get("/api/config", (req, res) => {
  cleanupExpiredVideos();
  res.json({
    config: botDatabase.config,
    videos: botDatabase.videos,
    logs: botDatabase.logs
  });
});

// Update configuration
app.post("/api/config", async (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: "Missing config body" });
  }

  const oldToken = botDatabase.config.botToken;
  botDatabase.config = { ...botDatabase.config, ...config };
  saveDatabase();
  insertLog("success", "Configuration settings updated successfully!");

  // If token changed, re-initiate Telegram bot polling
  if (config.botToken !== oldToken) {
    await updateTelegramBot();
  }

  cleanupExpiredVideos();
  res.json({
    config: botDatabase.config,
    videos: botDatabase.videos,
    logs: botDatabase.logs
  });
});

// Fetch all video items
app.get("/api/videos", (req, res) => {
  cleanupExpiredVideos();
  res.json(botDatabase.videos);
});

// Add multiple videos in bulk
app.post("/api/videos/bulk", (req, res) => {
  cleanupExpiredVideos();
  const { videos: videosToAdd } = req.body;
  if (!videosToAdd || !Array.isArray(videosToAdd)) {
    return res.status(400).json({ error: "Missing or invalid videos array for bulk add" });
  }

  const added: any[] = [];
  videosToAdd.forEach(v => {
    if (v.title && v.url) {
      const newVideo = {
        id: "vid_" + Math.random().toString(36).substr(2, 9),
        title: sanitizeVideoTitle(v.title),
        description: sanitizeVideoDescription(v.description || ""),
        url: v.url,
        tier: v.tier || "free",
        createdAt: Date.now()
      };
      botDatabase.videos.push(newVideo);
      added.push(newVideo);
    }
  });

  if (added.length > 0) {
    saveDatabase();
    insertLog("success", `Bulk upload: Successfully registered ${added.length} video assets simultaneously.`);
  }

  res.json(botDatabase.videos);
});

// Fetch all payment requests
app.get("/api/payments", (req, res) => {
  res.json(botDatabase.paymentRequests || []);
});

// Create simulated payment request from the web mockup board
app.post("/api/payments", (req, res) => {
  const { userId, username, planName, cost, days, screenshotUrl } = req.body;
  
  const newRequest = {
    id: "req_" + Math.random().toString(36).substr(2, 9),
    userId: userId || "sim_9876",
    username: username || "rehan_guest",
    planName: planName || "1 Day VIP Plan",
    cost: cost || 29,
    status: "pending" as const,
    timestamp: new Date().toISOString(),
    screenshotUrl: screenshotUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
    days: days || 1
  };
  
  if (!botDatabase.paymentRequests) botDatabase.paymentRequests = [];
  botDatabase.paymentRequests.push(newRequest);
  saveDatabase();
  
  insertLog("success", `[SIMULATOR] Sent simulated payment screenshot ticket for VIP Plan (${planName}) from user @${username}`);
  
  // Forward to target Telegram group if bot online
  forwardPaymentToGroup(newRequest);

  res.json(botDatabase.paymentRequests);
});

// Approve payment request
app.post("/api/payments/:id/approve", async (req, res) => {
  const { id } = req.params;
  const requests = botDatabase.paymentRequests || [];
  const reqItem = requests.find((r: any) => r.id === id);
  
  if (!reqItem) {
    return res.status(404).json({ error: "Payment request not found" });
  }
  
  reqItem.status = "approved";
  reqItem.screenshotUrl = ""; // Auto-delete screenshot receipt on approval to protect privacy recursively
  
  // Grant premium in DB to user session
  const uIdStr = reqItem.userId.toString();
  let dbUser = botDatabase.users[uIdStr];
  if (!dbUser) {
    dbUser = {
      userId: reqItem.userId,
      username: reqItem.username,
      isVerified: true,
      videoLimitUsed: 0,
      resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
      isPremium: true
    };
    botDatabase.users[uIdStr] = dbUser;
  }
  
  dbUser.isPremium = true;
  const validityDays = reqItem.days || 1;
  dbUser.premiumExpiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();
  saveDatabase();
  
  insertLog("success", `APPROVED payment screenshot for user @${reqItem.username} (ID: ${reqItem.userId}). VIP Plan (${reqItem.planName}) activated!`);
  
  // Send approval message to Telegram User
  try {
    const approvalText = `🎉 <b>CONGRATULATIONS! Premium Activated!</b>\n\n` +
      `Your payment screenshot has been verified by the Owner/Admin <b>@CHAT_VIP123</b>.\n\n` +
      `👑 <b>VIP Plan Details:</b>\n` +
      `• plan: <code>${escapeHtml(reqItem.planName)}</code>\n` +
      `• status: <code>ACTIVE ⚡</code>\n` +
      `• expires At: <code>${new Date(dbUser.premiumExpiresAt).toLocaleString()}</code>\n\n` +
      `🚫 <b>Ads have been disabled.</b>\n` +
      `🍿 You can now directly stream all premium course folders and videos recursively from our database!`;
      
    await tgBotInstance?.sendMessage(reqItem.userId, approvalText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎬 Fetch VIP Videos now", callback_data: "get_video" }],
          [{ text: "👤 View Profile Status", callback_data: "my_profile" }]
        ]
      }
    });
  } catch (tgErr: any) {
    insertLog("warning", `Approved ticket successfully but Telegram message dispatch to userId ${reqItem.userId} failed: ${tgErr.message}`);
  }
  
  res.json(botDatabase.paymentRequests);
});

// Reject payment request
app.post("/api/payments/:id/reject", async (req, res) => {
  const { id } = req.params;
  const requests = botDatabase.paymentRequests || [];
  const reqItem = requests.find((r: any) => r.id === id);
  
  if (!reqItem) {
    return res.status(404).json({ error: "Payment request not found" });
  }
  
  reqItem.status = "rejected";
  reqItem.screenshotUrl = ""; // Auto-delete screenshot instantly on rejection
  saveDatabase();
  
  insertLog("warning", `REJECTED payment confirmation screenshot ticket for @${reqItem.username} (ID: ${reqItem.userId})`);
  
  // Inform Telegram client
  try {
    const rejectText = `❌ <b>Verification Declined</b>\n\n` +
      `Sorry, your payment screenshot receipt for <b>${escapeHtml(reqItem.planName)}</b> was declined by Owner/Admin <b>@CHAT_VIP123</b> after manual review.\n\n` +
      `📞 Please request support or re-upload a valid transaction receipt screenshot if this is a mistake:\n` +
      `👉 <b>Support:</b> @CHAT_VIP123`;
      
    await tgBotInstance?.sendMessage(reqItem.userId, rejectText, { parse_mode: "HTML" });
  } catch (tgErr: any) {
    console.error("TG reject notify failed:", tgErr);
  }
  
  res.json(botDatabase.paymentRequests);
});

// Add video item
app.post("/api/videos", (req, res) => {
  const { title, description, url, tier, fileData, fileName } = req.body;
  
  let finalUrl = url;

  if (fileData && fileData.startsWith("data:")) {
    try {
      const match = fileData.match(/^data:(video\/[a-zA-Z0-9.\-_+]+);base64,(.+)$/);
      if (match) {
        const base64Data = match[2];
        const ext = fileName && fileName.includes(".") ? fileName.split(".").pop() : "mp4";
        const uniqueFileName = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFileName);
        
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        
        const appUrl = botDatabase.config.baseUrl || `https://ais-dev-3j5c4xhe6hplftj4xnvnk5-797595749574.asia-southeast1.run.app`;
        finalUrl = `${appUrl}/uploads/${uniqueFileName}`;
      }
    } catch (err: any) {
      console.error("Error writing uploaded file:", err);
      return res.status(500).json({ error: `File upload failed: ${err.message}` });
    }
  }

  if (!title || !finalUrl) {
    return res.status(400).json({ error: "Missing required fields (title & url)" });
  }

  const newVideo: VideoItem = {
    id: "vid_" + Math.random().toString(36).substr(2, 9),
    title: sanitizeVideoTitle(title),
    description: sanitizeVideoDescription(description || ""),
    url: finalUrl,
    tier: tier || "free",
    createdAt: Date.now()
  };

  botDatabase.videos.push(newVideo);
  saveDatabase();
  insertLog("success", `New video added: "${title}" (Tier: ${newVideo.tier})`);

  res.json(botDatabase.videos);
});

// Delete video item
app.delete("/api/videos/:id", (req, res) => {
  const { id } = req.params;
  const initialCount = botDatabase.videos.length;
  const targetVideo = botDatabase.videos.find(v => v.id === id);

  botDatabase.videos = botDatabase.videos.filter(v => v.id !== id);
  
  if (botDatabase.videos.length < initialCount) {
    saveDatabase();
    insertLog("warning", `Video with ID ${id} deleted.`);

    // If it has a physical file, clean it from disk
    if (targetVideo && targetVideo.url && targetVideo.url.includes("/uploads/")) {
      try {
        const fileName = targetVideo.url.split("/uploads/").pop();
        if (fileName) {
          const filePath = path.join(UPLOADS_DIR, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Physically unlinked video file on request: ${filePath}`);
          }
        }
      } catch (fileErr) {
        console.error("Failed to delete video file from disk:", fileErr);
      }
    }

    res.json({ success: true, videos: botDatabase.videos });
  } else {
    res.status(404).json({ error: "Video not found" });
  }
});

// Clear logs
app.post("/api/logs/clear", (req, res) => {
  botDatabase.logs = [
    {
      id: "1",
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Activity Logs Cleared by Admin."
    }
  ];
  saveDatabase();
  res.json({ success: true, logs: botDatabase.logs });
});

// Simulate user interaction
app.post("/api/users/simulate", (req, res) => {
  const customId = Math.floor(100000 + Math.random() * 900000);
  const randomUserNames = [
    "neymar_fan", "abhimanu_99", "betalelo", "rehan_bhai", "sharma_tech", 
    "verma_vip", "modded_guy", "vip_learner", "tech_wizard", "gpay_pro"
  ];
  const choseUsername = randomUserNames[Math.floor(Math.random() * randomUserNames.length)] + "_" + Math.floor(Math.random() * 100);
  const uIdStr = customId.toString();

  botDatabase.users[uIdStr] = {
    userId: customId,
    username: choseUsername,
    isVerified: true,
    videoLimitUsed: Math.floor(Math.random() * 5),
    resetAt: new Date(Date.now() + botDatabase.config.resetHours * 60 * 60 * 1000).toISOString(),
    isPremium: false
  };

  insertLog("success", `[Owner Console] Auto-simulated a new registered Free Member: @${choseUsername} (${customId})`);
  saveDatabase();
  res.json({ success: true, users: botDatabase.users });
});

// Toggle premium state admin override
app.post("/api/users/:id/toggle-premium", (req, res) => {
  const { id } = req.params;
  const user = botDatabase.users[id];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.isPremium = !user.isPremium;
  if (user.isPremium) {
    user.premiumExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 Days default override
    insertLog("success", `[Owner Overriding] Granted VIP Access manually to user @${user.username || id}`);
  } else {
    delete user.premiumExpiresAt;
    insertLog("warning", `[Owner Overriding] Revoked VIP Access from @${user.username || id}`);
  }

  saveDatabase();
  res.json({ success: true, users: botDatabase.users });
});

// Kick / Delete user completely from register cache
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  if (!botDatabase.users[id]) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = botDatabase.users[id];
  delete botDatabase.users[id];
  insertLog("warning", `[Owner Desk] Kicked and pruned user @${user.username || id} from database`);
  saveDatabase();
  res.json({ success: true, users: botDatabase.users });
});

// Simulate a Web Interface Bot Action in the logs
app.post("/api/simulate", (req, res) => {
  const { level, message } = req.body;
  if (!level || !message) {
    return res.status(400).json({ error: "Missing logs properties" });
  }
  insertLog(level, `[SIMULATION] ${message}`);
  res.json({ success: true, logs: botDatabase.logs });
});

// Dynamic Video Streaming / Download Portal Endpoint
app.get("/video/:id", async (req, res) => {
  const { id } = req.params;
  const video = botDatabase.videos.find(v => v.id === id);
  if (!video) {
    return res.status(404).send(`
      <html>
        <head>
          <title>Video Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0f19] text-slate-100 font-sans flex flex-col justify-center items-center min-h-screen p-4">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center shadow-2xl">
            <div class="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h1 class="text-xl font-extrabold text-white">Video Link Expired</h1>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">
              Any video uploaded is automatically deleted after 10 minutes to respect user requests. This content is no longer active.
            </p>
            <a href="/" class="inline-block mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-blue-500/10">Return to Admin Area</a>
          </div>
        </body>
      </html>
    `);
  }

  // Check if it is a Telegram file_id
  const isDirectTelegramFile = !video.url.startsWith("http") && (video.url.startsWith("file_id:") || video.url.match(/^[a-zA-Z0-9_\-]{30,}$/));

  if (isDirectTelegramFile) {
    let fileId = video.url;
    if (fileId.startsWith("file_id:")) {
      fileId = fileId.slice("file_id:".length);
    }

    try {
      const token = botDatabase.config.botToken;
      if (token) {
        const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
        const fileRes = await fetch(getFileUrl);
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result && fileData.result.file_path) {
            const realFileUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
            return res.redirect(realFileUrl);
          }
        }
      }
    } catch (err: any) {
      console.error("Error communicating with Telegram Bot API for file download path:", err);
    }
    
    // Static HTML fallback for custom Telegram File ID
    return res.send(`
      <html>
        <head>
          <title>${escapeHtml(video.title)}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0f19] text-slate-100 font-sans flex flex-col justify-center items-center min-h-screen p-4">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <div class="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">🎬</div>
            <h1 class="text-lg font-extrabold text-white leading-tight">${escapeHtml(video.title)}</h1>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">${escapeHtml(video.description || "Premium Video Item")}</p>
            <div class="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 my-5 text-left text-xs font-mono">
              <span class="text-[10px] text-slate-500 block font-sans uppercase font-bold tracking-wider mb-1">Telegram file_id:</span>
              <span class="text-blue-400 break-all select-all">${escapeHtml(fileId)}</span>
            </div>
            <p class="text-[10px] text-amber-500 bg-amber-500/5 py-2 px-3 border border-amber-500/10 rounded-lg">
              🔑 Stream directly from inside the Telegram App!
            </p>
          </div>
        </body>
      </html>
    `);
  }

  // It's a standard HTTP URL, we direct the client to play or download it!
  const timeDifference = video.createdAt ? Math.max(0, 10 - Math.floor((Date.now() - video.createdAt) / 60000)) : 10;

  return res.send(`
    <html>
      <head>
        <title>Stream - ${escapeHtml(video.title)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-[#070a13] text-slate-100 font-sans flex flex-col items-center justify-center min-h-screen p-4">
        <div class="w-full max-w-2xl bg-[#0e1424] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          
          <!-- Embedded responsive video player -->
          <div class="relative aspect-video bg-black flex items-center justify-center border-b border-slate-800/80">
            <video 
              src="${escapeHtml(video.url)}" 
              controls 
              autoplay
              class="w-full h-full object-contain"
            ></video>
          </div>

          <!-- Video Details metadata section -->
          <div class="p-6 md:p-8 flex flex-col gap-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <span class="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Active Stream
                </span>
                <h1 class="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">${escapeHtml(video.title)}</h1>
              </div>
              <span class="text-xs bg-slate-800/80 border border-slate-700/50 py-1.5 px-3 rounded-xl font-mono text-slate-400 shrink-0">
                🧹 Auto-delete: ${timeDifference} min
              </span>
            </div>

            <p class="text-xs md:text-sm text-slate-400 leading-relaxed mt-1">
              ${escapeHtml(video.description || "Premium Video content streamed instantly.")}
            </p>

            <div class="flex items-center justify-between border-t border-slate-800/80 pt-5 mt-2 gap-4">
              <a 
                href="${escapeHtml(video.url)}" 
                download
                class="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-5 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-95"
              >
                📥 Download Original Video File
              </a>
              <button 
                onclick="window.close()" 
                class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-5 rounded-2xl text-xs sm:text-sm transition-all"
              >
                Close Player
              </button>
            </div>
          </div>

        </div>

        <p class="text-[10px] text-slate-500 mt-5">Stream hosted on Secure VIP Nodes • Connected to @CHAT_VIP123</p>
      </body>
    </html>
  `);
});

// Periodic background worker to delete dynamic uploads after 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;

  // Filter video items that have a "createdAt" timestamp and are past 10 minutes
  const expiredVideos = botDatabase.videos.filter(v => v.createdAt && (now - v.createdAt >= tenMinutes));

  if (expiredVideos.length > 0) {
    const expiredIds = expiredVideos.map(v => v.id);
    botDatabase.videos = botDatabase.videos.filter(v => !expiredIds.includes(v.id));
    saveDatabase();

    expiredVideos.forEach(v => {
      insertLog("warning", `🧹 Expiry Daemon: Auto-deleted video "${v.title}" (ID: ${v.id}) after 10-minute maximum lifetime.`);
    });
  }
}, 15000); // Expiry check daemon ticker runs every 15 seconds for precision

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite integration for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Production serving from built static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Full-Stack Dashboard online at http://localhost:${PORT}`);
  });
}

startServer();
