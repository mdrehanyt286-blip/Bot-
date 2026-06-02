import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Video, 
  User, 
  Users, 
  Plus, 
  Trash, 
  Settings, 
  Code, 
  Github, 
  Terminal, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  HelpCircle, 
  Send,
  Eye,
  RefreshCw,
  Cpu,
  Tv,
  Check,
  ListRestart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BotConfig, VideoItem, UserSession, LogEntry, PaymentRequest } from "./types";

export default function App() {
  // Config & state
  const [config, setConfig] = useState<BotConfig>({
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
    ownerUsername: "CHAT_VIP123"
  });
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<Record<string, UserSession>>({});
  const [activeTab, setActiveTab] = useState<"simulator" | "library" | "approvals" | "users" | "deploy">("simulator");
  const [userFilter, setUserFilter] = useState<"all" | "free" | "premium">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  
  // New video form
  const [newVideo, setNewVideo] = useState({ title: "", description: "", url: "", tier: "free" });
  const [videoFormError, setVideoFormError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ raw: File | null; base64: string; name: string }[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Bulk Upload state variables
  const [bulkVideoText, setBulkVideoText] = useState("");
  const [bulkTier, setBulkTier] = useState<"free" | "premium">("free");
  const [isBulking, setIsBulking] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Payment screenshot upload state
  const [paymentFile, setPaymentFile] = useState<{ base64: string; name: string }>({ base64: "", name: "" });

  // Simulation Bot State (Virtual client inside mockup)
  const [simUser, setSimUser] = useState<UserSession>({
    userId: "sim_9876",
    username: "rehan_guest",
    isVerified: false,
    videoLimitUsed: 0,
    resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    isPremium: false
  });
  
  // Chat History
  interface ChatMessage {
    id: string;
    sender: "bot" | "user" | "system";
    text: string;
    timestamp: string;
    buttons?: { text: string; callback: string; url?: string }[];
    videoPayload?: VideoItem;
    isPremiumBanner?: boolean;
    qrUrl?: string; // QR image to display inside chat bubble directly
  }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "system",
      text: "Simulator ready. Type /start or click 'Simulate /start' below to power on.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Simulation details
  const [isSimAdActive, setIsSimAdActive] = useState(false);
  const [simAdCountdown, setSimAdCountdown] = useState(3);
  const [isSimJoiningChannel, setIsSimJoiningChannel] = useState(false);
  const [isSimJoined, setIsSimJoined] = useState(false);
  const [simTextInput, setSimTextInput] = useState("");
  
  // Active checkout status inside simulator
  const [simCheckoutPlan, setSimCheckoutPlan] = useState<{ plan: string; title: string; cost: number; days: number } | null>(null);
  
  // On-board direct cinema video downloader simulation state
  const [downloadsQueue, setDownloadsQueue] = useState<{ active: boolean; progress: number; video: VideoItem | null; speed: number }>({
    active: false,
    progress: 0,
    video: null,
    speed: 0
  });

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/payments");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error("Error fetching payments queue:", err);
    }
  };

  // Poll server for logs & config initially & periodically
  const fetchState = async () => {
    try {
      const res = await fetch("/api/config");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        if (data.videos) {
          setVideos(data.videos);
        }
        if (data.logs) {
          setLogs(data.logs);
        }
        if (data.users) {
          setUsers(data.users);
        }
      }
      await fetchPayments();
    } catch (err) {
      console.error("Error loading server configuration:", err);
    }
  };

  useEffect(() => {
    fetchState();
    
    // Auto-refresh logs and activity every 4 seconds
    const interval = setInterval(() => {
      fetchLogs();
      fetchPayments();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/config");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Error refreshing logs:", err);
    }
  };

  // Save Config to Server
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config })
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setConfig(data.config);
        setLogs(data.logs);
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i);
      if (f) filesArray.push(f);
    }

    const tooLarge = filesArray.some((f: File) => f.size > 20 * 1024 * 1024);
    if (tooLarge) {
      setVideoFormError("Direct video uploads are capped at 20MB. Please paste a URL for larger videos.");
      return;
    }

    const loadedFiles: { raw: any; base64: string; name: string }[] = [];
    let loadedCount = 0;

    filesArray.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        loadedFiles.push({
          raw: file,
          base64: reader.result as string,
          name: file.name
        });
        loadedCount++;
        if (loadedCount === filesArray.length) {
          setSelectedFiles(prev => [...prev, ...loadedFiles]);
          setVideoFormError("");
          if (!newVideo.title.trim()) {
            setNewVideo(prev => ({ ...prev, title: file.name.split(".")[0] }));
          }
          setNewVideo(prev => ({ ...prev, url: `Direct Files: [${filesArray.length} items loaded]` }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Add video item
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoFormError("");
    
    const hasLocalUploads = selectedFiles.length > 0;

    if (!newVideo.title.trim() && !hasLocalUploads) {
      setVideoFormError("Title is required (or upload media files).");
      return;
    }

    if (!newVideo.url.trim() && !hasLocalUploads) {
      setVideoFormError("Url/File ID or Local File are required.");
      return;
    }

    try {
      setIsUploadingFile(true);

      if (hasLocalUploads) {
        let lastUpdatedList = videos;
        for (let i = 0; i < selectedFiles.length; i++) {
          const fileObj = selectedFiles[i];
          if (!fileObj) continue;
          const fileTitle = selectedFiles.length === 1 && newVideo.title.trim()
            ? newVideo.title.trim()
            : fileObj.name.split(".")[0];

          const payload = {
            title: fileTitle,
            description: newVideo.description || `Uploaded directly via Admin console: ${fileObj.name}`,
            url: "",
            tier: newVideo.tier || "free",
            fileData: fileObj.base64,
            fileName: fileObj.name
          };

          const res = await fetch("/api/videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            lastUpdatedList = data;
          } else {
            console.error(`Failed to upload ${fileObj.name}`);
          }
        }
        setVideos(lastUpdatedList);
        setNewVideo({ title: "", description: "", url: "", tier: "free" });
        setSelectedFiles([]);
        fetchLogs();
      } else {
        const payload = {
          title: newVideo.title,
          description: newVideo.description,
          url: newVideo.url,
          tier: newVideo.tier || "free"
        };

        const res = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setVideos(data);
          setNewVideo({ title: "", description: "", url: "", tier: "free" });
          fetchLogs();
        } else {
          setVideoFormError("Failed to register video on server.");
        }
      }
    } catch (err) {
      setVideoFormError("Could not reach backend.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Bulk upload multiple videos at once
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError("");

    if (!bulkVideoText.trim()) {
      setBulkError("Please insert at least one video item URL or Title | URL lines.");
      return;
    }

    const lines = bulkVideoText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const parsedVideos: { title: string; url: string; description: string; tier: "free" | "premium" }[] = [];

    lines.forEach((line, index) => {
      if (line.includes("|")) {
        const parts = line.split("|").map(p => p.trim());
        const title = parts[0] || `Bulk Video ${index + 1}`;
        const url = parts[1] || "";
        const description = parts[2] || "Bulk uploaded video asset.";
        if (url) {
          parsedVideos.push({ title, url, description, tier: bulkTier });
        }
      } else {
        if (line.length > 3) {
          parsedVideos.push({
            title: `Bulk Video ${index + 1} (${new Date().toLocaleDateString()})`,
            url: line,
            description: "Registered using bulk text block.",
            tier: bulkTier
          });
        }
      }
    });

    if (parsedVideos.length === 0) {
      setBulkError("We could not parse any valid video entries. Specify at least one URL (optionally prefixed by standard Title | ).");
      return;
    }

    try {
      setIsBulking(true);
      const res = await fetch("/api/videos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: parsedVideos })
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const updatedVideosList = await res.json();
        setVideos(updatedVideosList);
        setBulkVideoText("");
        fetchLogs();
      } else {
        setBulkError("Server replied with error or invalid response during bulk save.");
      }
    } catch (err) {
      setBulkError("Could not connect to backend server for bulk registration.");
    } finally {
      setIsBulking(false);
    }
  };

  // Delete Video
  const handleDeleteVideo = async (id: string) => {
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setVideos(data.videos);
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/logs/clear", { method: "POST" });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Server Simulation Endpoint log trigger helper
  const triggerSimulationLog = async (level: "info" | "success" | "warning" | "error", msgTxt: string) => {
    try {
      await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, message: msgTxt })
      });
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  };

  // Chat message simulator list appender
  const appendChatMessage = (
    sender: "bot" | "user" | "system", 
    text: string, 
    buttons?: ChatMessage["buttons"], 
    videoPayload?: VideoItem, 
    isPremiumBanner?: boolean,
    qrUrl?: string
  ) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buttons,
      videoPayload,
      isPremiumBanner,
      qrUrl
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  // Clean slate reset for simulation
  const resetSimulation = () => {
    setSimUser({
      userId: "sim_9876",
      username: "rehan_guest",
      isVerified: false,
      videoLimitUsed: 0,
      resetAt: new Date(Date.now() + config.resetHours * 60 * 60 * 1000).toISOString(),
      isPremium: false
    });
    setIsSimJoined(false);
    setChatMessages([
      {
        id: "sys_reset",
        sender: "system",
        text: "Simulation restarted. Click '/start' inside the phone layout to try the bot flow.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    triggerSimulationLog("info", "User reloaded/cleared the simulator flow state.");
  };

  // Simulated click or keyboard logic for Telegram interactions
  const handleSimInput = async (command: string) => {
    if (isSimAdActive) return; // Block while watching ad

    if (command === "/start") {
      appendChatMessage("user", "/start");
      triggerSimulationLog("info", `User @${simUser.username} issued command: /start`);
      
      setTimeout(() => {
        appendChatMessage(
          "bot",
          `👋 Hello @${simUser.username}!\n\nWelcome to our Video Bot service.\n\n🔒 To access video contents, you must first join our mandatory promotional updates channel:\n👉 ${config.channelUsername}\n\nJoin using the link below, then click "Verify Verification ✅" to unlock the "Get Video" action.`,
          [
            { text: `📢 Join ${config.channelUsername}`, callback: "join_channel_url" },
            { text: "✅ Verify Verification", callback: "verify_join" }
          ]
        );
      }, 500);
    }

    else if (command === "/paid_user get_video bot_upload") {
      appendChatMessage("user", "/paid_user get_video bot_upload");
      triggerSimulationLog("info", `User @${simUser.username} issued paid command: /paid_user get_video bot_upload`);

      setTimeout(() => {
        if (!simUser.isPremium) {
          triggerSimulationLog("warning", `Access denied command /paid_user: @${simUser.username} is not Premium.`);
          appendChatMessage(
            "bot",
            `❌ *Access Denied*\n\nThe command \`/paid_user get_video bot_upload\` is reserved for *VIP Premium Members* only.\n\n👑 *VIP Premium Perks:*\n• Directly access premium videos\n• No ads or waiting delays\n• Sequential video navigation (Next/Prev)\n\n💳 Press "Upgrade to Premium Plan" below to unlock simulated VIP access instantly!`,
            [
              { text: "💎 Upgrade to Premium Plan", callback: "get_premium" },
              { text: "👤 Return to Profile Overview", callback: "my_profile" }
            ],
            undefined,
            false
          );
        } else {
          // Serve premium video browse flow
          setSimUser(prev => ({ ...prev, currentVideoIndex: 0 }));
          triggerSimulationLog("success", `@${simUser.username} validated as VIP. Serving paid video sequentially.`);
          setTimeout(() => {
            serveSimulatedVideo(true, 0);
          }, 100);
        }
      }, 500);
    }

    else if (command === "/free_user get_video bot_upload") {
      appendChatMessage("user", "/free_user get_video bot_upload");
      triggerSimulationLog("info", `User @${simUser.username} issued command: /free_user get_video bot_upload`);

      setTimeout(() => {
        if (!simUser.isVerified) {
          triggerSimulationLog("warning", `Subscription check pending for free user @${simUser.username}`);
          appendChatMessage("bot", "⚠️ Please join the channel and click 'Verify Verification' first before using free request commands!", [
            { text: `📢 Join ${config.channelUsername}`, callback: "join_channel_url" },
            { text: "✅ Verify Verification", callback: "verify_join" }
          ]);
          return;
        }

        if (simUser.videoLimitUsed >= config.videoLimit) {
          triggerSimulationLog("warning", `@${simUser.username} hit free request limit cap matching /free_user query.`);
          appendChatMessage(
            "bot",
            `❌ Standard free limit reached (0/10 remaining).\n\nBuy Premium for instant unlimited queries.`,
            [
              { text: "💎 Upgrade to Premium Plan", callback: "get_premium" },
              { text: "👤 View My Profile", callback: "my_profile" }
            ]
          );
          return;
        }

        // Show ad, then serve
        triggerSimulationLog("info", `Displaying simulated ${config.adDuration}s sponsor ad matching /free_user command...`);
        setIsSimAdActive(true);
        setSimAdCountdown(config.adDuration);
        
        let counter = config.adDuration;
        const interval = setInterval(() => {
          counter -= 1;
          setSimAdCountdown(counter);
          if (counter <= 0) {
            clearInterval(interval);
            setIsSimAdActive(false);
            setSimUser(prev => ({ ...prev, videoLimitUsed: prev.videoLimitUsed + 1 }));
            // Set index to 0 for browsing sequentially from start
            setSimUser(prev => ({ ...prev, currentVideoIndex: 0 }));
            setTimeout(() => {
              serveSimulatedVideo(false, 0);
            }, 50);
          }
        }, 1000);
      }, 500);
    }

    // CUSTOM INPUT MESSAGE INTRODUCED
    else {
      appendChatMessage("user", command);
      triggerSimulationLog("info", `Simulator processes user input: "${command}"`);

      const textCleaned = command.trim();
      const textLower = textCleaned.toLowerCase();

      // Check command style: /addvideo or /upload
      if (textLower.startsWith("/addvideo") || textLower.startsWith("/upload")) {
        const partsMatched = textCleaned.match(/^\/(addvideo|upload)(?:\s+([\s\S]+))?/i);
        const argString = partsMatched ? partsMatched[2] : "";

        if (!argString || argString.trim() === "") {
          setTimeout(() => {
            appendChatMessage(
              "bot",
              `💡 *Direct Video Upload Format:* \n\n` +
              `You can register videos directly using command formats like:\n` +
              `\`/addvideo <tier> | <title> | <url> | <description>\`\n\n` +
              `*Example:*\n` +
              `\`/addvideo free | My First Tool | https://t.me/ytx12_b/5 | Sourced via Channel\`\n\n` +
              `*Alternative:*\n` +
              `Simply type or paste any Telegram post link (e.g. \`https://t.me/ytx12_b/10\`) and we'll prompt you to save it instantly!`
            );
          }, 450);
          return;
        }

        let tier: "free" | "premium" = "free";
        let title = "";
        let url = "";
        let description = "";

        if (argString.includes("|")) {
          const parts = argString.split("|").map(p => p.trim());
          const tierInput = parts[0]?.toLowerCase();
          tier = (tierInput === "premium" || tierInput === "vip") ? "premium" : "free";
          title = parts[1] || "";
          url = parts[2] || "";
          description = parts[3] || "";
        } else {
          const parts = argString.split(/\s+/);
          const tierInput = parts[0]?.toLowerCase();
          tier = (tierInput === "premium" || tierInput === "vip") ? "premium" : "free";
          
          const urlIndex = parts.findIndex(p => p.startsWith("http://") || p.startsWith("https://") || p.includes("t.me/"));
          if (urlIndex !== -1) {
            url = parts[urlIndex];
            title = parts.slice(1, urlIndex).join(" ") || "";
            description = parts.slice(urlIndex + 1).join(" ") || "";
          }
        }

        if (!url) {
          setTimeout(() => {
            appendChatMessage("bot", "❌ *Upload Error:* Direct link/video url is missing. Format: \`/addvideo premium | Title | URL\`.");
          }, 450);
          return;
        }

        const realTitle = title || `Channel Upload Video #${videos.length + 1}`;
        const realDesc = description || `Directly uploaded from simulator chat command.`;

        try {
          const res = await fetch("/api/videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: realTitle,
              description: realDesc,
              url: url,
              tier: tier
            })
          });

          if (res.ok) {
            const updatedVids = await res.json();
            setVideos(updatedVids);
            triggerSimulationLog("success", `Simulator successfully added video asset: "${realTitle}" via command`);

            setTimeout(() => {
              appendChatMessage(
                "bot",
                `✅ *Successfully Registered Video inside Bot!*\n\n` +
                `📝 *Title:* ${realTitle}\n` +
                `👑 *Tier:* ${tier === "premium" ? "Premium 💎" : "Free Tier 🆓"}\n` +
                `🔗 *Url:* \`${url}\`\n\n` +
                `🍿 Placed immediately in server database playlist!`
              );
            }, 500);
          }
        } catch (err) {
          console.error("Simulator command upload failure:", err);
        }
      } 
      // Check if it's a Telegram or any post URL structure
      else if (textLower.includes("t.me/") || textLower.startsWith("http://") || textLower.startsWith("https://")) {
        const urlMatch = textCleaned.match(/(https?:\/\/[^\s]+)/i) || [textCleaned];
        const detectedUrl = urlMatch[0];

        setSimUser(prev => ({ ...prev, pendingUploadUrl: detectedUrl }));
        triggerSimulationLog("info", `Simulator detected prospect URL upload: ${detectedUrl}`);

        setTimeout(() => {
          appendChatMessage(
            "bot",
            `📥 *Direct Video Upload Detection*\n\n` +
            `I detected you sent a video stream or channel post link:\n` +
            `🔗 \`${detectedUrl}\`\n\n` +
            `Choose the target subscription tier to register this video directly to the bot library:`,
            [
              { text: "🆓 Upload as FREE Video", callback: "save_direct_free" },
              { text: "💎 Upload as PREMIUM Video", callback: "save_direct_premium" },
              { text: "❌ Cancel Upload", callback: "save_direct_cancel" }
            ]
          );
        }, 500);
      } 
      // Help responder
      else {
        setTimeout(() => {
          appendChatMessage(
            "bot",
            `🤖 *Verified Video Bot Assistant*\n\n` +
            `I didn't recognize that command! Did you mean:\n` +
            `• \`/start\` - Main verified gate screen\n` +
            `• \`/addvideo free | My Title | https://t.me/xx/1\` - Add video asset\n` +
            `• Or paste a Telegram video link (e.g. \`https://t.me/ytx12_b/42\`) to auto-upload directly!`
          );
        }, 500);
      }
    }
  };

  // Callback query clicked simulations
  const handleSimCallback = async (callback: string) => {
    if (isSimAdActive) return;

    if (callback === "save_direct_free" || callback === "save_direct_premium") {
      const tier = callback === "save_direct_premium" ? "premium" : "free";
      const directUrl = simUser.pendingUploadUrl;

      if (!directUrl) {
        appendChatMessage("bot", "❌ *Session expired!* Please send the video link again to upload directly.");
        return;
      }

      triggerSimulationLog("info", `Attempting direct upload for link: ${directUrl}`);
      appendChatMessage("user", `Confirming Upload as ${tier.toUpperCase()}`);

      try {
        const payload = {
          title: `Direct Channel Upload #${videos.length + 1}`,
          description: `Directly registered from simulated channel post link: ${directUrl}`,
          url: directUrl,
          tier: tier
        };

        const res = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updatedVids = await res.json();
          setVideos(updatedVids);
          setSimUser(prev => ({ ...prev, pendingUploadUrl: undefined }));
          triggerSimulationLog("success", `Directly registered new ${tier} video from source: ${directUrl}`);

          setTimeout(() => {
            appendChatMessage(
              "bot",
              `✅ *Successfully Registered Video inside Bot Library!*\n\n` +
              `📝 *Title:* _Direct Channel Upload #${updatedVids.length}_\n` +
              `👑 *Tier Classification:* ${tier === "premium" ? "Premium 💎" : "Free Tier 🆓"}\n` +
              `🔗 *URL/Source:* \`${directUrl}\`\n\n` +
              `🍿 Now playable directly in both browser chat commands and the main bot lists!`
            );
          }, 450);
        }
      } catch (err) {
        console.error("Direct upload failed inside simulator:", err);
      }
      return;
    }

    else if (callback === "save_direct_cancel") {
      appendChatMessage("user", "❌ Cancel Upload direct");
      setSimUser(prev => ({ ...prev, pendingUploadUrl: undefined }));
      triggerSimulationLog("info", "Direct channel video upload cancelled by client.");
      setTimeout(() => {
        appendChatMessage("bot", "❌ Campaign upload cancelled. Pending link session is cleared.");
      }, 400);
      return;
    }

    else if (callback === "join_channel_url") {
      setIsSimJoiningChannel(true);
      triggerSimulationLog("info", `User clicked simulated join button for channel ${config.channelUsername}`);
      appendChatMessage("system", `Redirecting client to promotional channel (${config.channelUsername})...`);
    } 
    
    else if (callback === "verify_join") {
      appendChatMessage("user", "🔄 Clicked Verification Check");
      triggerSimulationLog("info", `Verifying membership parameters for @${simUser.username}`);

      setTimeout(() => {
        if (!isSimJoined) {
          appendChatMessage(
            "bot",
            `❌ You have not joined the channel yet! Please join and try again.\n\nRequired: Join ${config.channelUsername} then click Verify below:`,
            [
              { text: `📢 Join ${config.channelUsername}`, callback: "join_channel_url" },
              { text: "✅ Verify Verification", callback: "verify_join" }
            ]
          );
          triggerSimulationLog("warning", `Subscription check failed: @${simUser.username} is not found in ${config.channelUsername}`);
        } else {
          setSimUser(prev => ({ ...prev, isVerified: true }));
          triggerSimulationLog("success", `Subscription check passed: @${simUser.username} verified as a member!`);
          
          appendChatMessage(
            "bot",
            `Successfully Verified! 🎉\n\nYou now have full permission to retrieve video guides.\n\n👑 Plan Status: ${simUser.isPremium ? "Premium 💎 (Ad-Free)" : "Free 🎬 (With Ads)"}\n⚡ Free Limits Remaining: ${Math.max(0, config.videoLimit - simUser.videoLimitUsed)}/10\n\nChoose an option below:`,
            [
              { text: "🎬 Free Videos", callback: "get_video" },
              { text: "💎 Premium Videos", callback: "get_premium_video" },
              { text: "👤 Free User", callback: "my_profile" },
              { text: "💎 Get Premium", callback: "get_premium" }
            ]
          );
        }
      }, 650);
    }

    else if (callback === "get_premium_video") {
      appendChatMessage("user", "💎 Explore Premium VIP Videos");
      
      if (!simUser.isVerified) {
        appendChatMessage("bot", "⚠️ Please join the channel and click 'Verify Verification' first!", [
          { text: `📢 Join ${config.channelUsername}`, callback: "join_channel_url" },
          { text: "✅ Verify Verification", callback: "verify_join" }
        ]);
        return;
      }

      if (!simUser.isPremium) {
        triggerSimulationLog("warning", `@${simUser.username} blocked from Premium files: Requires active paid upgrade!`);
        appendChatMessage("bot", "❌ *VIP Premium Access Denied!*\n\nThese premium course training videos are reserved for VIP members only.\n\nPlease purchase a premium plan to unlock unlimited ad-free access!", [
          { text: "💎 Upgrade to Premium Plan", callback: "get_premium" },
          { text: "👤 View Profile Status", callback: "my_profile" }
        ]);
        return;
      }

      triggerSimulationLog("info", `@${simUser.username} (Premium) requesting VIP video.`);
      serveSimulatedVideo(true, 0);
    }

    else if (callback === "get_video") {
      appendChatMessage("user", "🎬 Retrieve Video Asset");
      
      if (!simUser.isVerified) {
        appendChatMessage("bot", "⚠️ Please join the channel and click 'Verify Verification' first!", [
          { text: `📢 Join ${config.channelUsername}`, callback: "join_channel_url" },
          { text: "✅ Verify Verification", callback: "verify_join" }
        ]);
        return;
      }

      // Check Limits if not premium
      if (!simUser.isPremium && simUser.videoLimitUsed >= config.videoLimit) {
        triggerSimulationLog("warning", `@${simUser.username} hit free request limits cap.`);
        appendChatMessage(
          "bot",
          `❌ Standard downloads limit exceeded (0/10 available).\n\nYour limit resets automatically in 12 hours.\n\n👑 Buy Premium for instant, unlimited downloads with absolutely NO Ads!`,
          [
            { text: "💎 Upgrade to Premium Plan", callback: "get_premium" },
            { text: "👤 View My Profile", callback: "my_profile" }
          ]
        );
        return;
      }

      // Premium Instant Delivery
      if (simUser.isPremium) {
        triggerSimulationLog("info", `@${simUser.username} (Premium) requesting video - bypassing ads.`);
        serveSimulatedVideo(true);
      } else {
        // Free Ad timer flow!
        triggerSimulationLog("info", `Displaying simulated ${config.adDuration}s ad frame to @${simUser.username}...`);
        setIsSimAdActive(true);
        setSimAdCountdown(config.adDuration);
        
        let counter = config.adDuration;
        const interval = setInterval(() => {
          counter -= 1;
          setSimAdCountdown(counter);
          if (counter <= 0) {
            clearInterval(interval);
            setIsSimAdActive(false);
            setSimUser(prev => ({ ...prev, videoLimitUsed: prev.videoLimitUsed + 1 }));
            serveSimulatedVideo(false, 0);
          }
        }, 1000);
      }
    }

    else if (callback === "prev_vid") {
      appendChatMessage("user", "⏮️ Previous Video File");
      serveSimulatedVideo(simUser.isPremium, -1);
    }

    else if (callback === "next_vid") {
      appendChatMessage("user", "⏭️ Next Video File");
      serveSimulatedVideo(simUser.isPremium, 1);
    }

    else if (callback === "random_vid") {
      appendChatMessage("user", "🎰 Get Random Video");
      const userTier = simUser.isPremium ? "premium" : "free";
      let filteredVids = videos.filter(v => v.tier === userTier);
      if (filteredVids.length === 0) filteredVids = videos;
      
      if (filteredVids.length > 0) {
        const randIdx = Math.floor(Math.random() * filteredVids.length);
        setSimUser(prev => ({ ...prev, currentVideoIndex: randIdx }));
        setTimeout(() => {
          serveSimulatedVideo(simUser.isPremium, 0);
        }, 80);
      } else {
        serveSimulatedVideo(simUser.isPremium, 0);
      }
    }

    else if (callback === "my_profile") {
      appendChatMessage("user", "👤 View My Profile");
      
      const now = new Date();
      const resetTime = new Date(simUser.resetAt);
      const remainingHours = Math.max(0, Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 1000 * 60)));

      setTimeout(() => {
        appendChatMessage(
          "bot",
          `👤 *YOUR USER PROFILE*\n\n` +
          `• ID: \`sim_9876\`\n` +
          `• Username: @${simUser.username}\n` +
          `• Verified Status: ${simUser.isVerified ? "✅ Account Verified" : "❌ Subscriptions Pending"}\n` +
          `• Plan: ${simUser.isPremium ? "Premium 💎 (Ad-Free)" : "Free Tier (With Ads)"}\n\n` +
          `${simUser.isPremium ? "✨ Enjoy unlimited lightning-fast video delivery!" : `• Free Limits: ${Math.max(0, config.videoLimit - simUser.videoLimitUsed)}/10 Remaining\n• Limit Resets automatically in ${remainingHours}h`}`,
          [
            { text: "🎬 Get Video", callback: "get_video" },
            !simUser.isPremium ? { text: "💎 Upgrade to Premium", callback: "get_premium" } : { text: "🔙 main Menu", callback: "verify_join" }
          ].filter(Boolean) as ChatMessage["buttons"]
        );
      }, 400);
    }

    else if (callback === "get_premium") {
      appendChatMessage("user", "💎 Explore Premium Tier");
      
      setTimeout(() => {
        appendChatMessage(
          "bot",
          `💎 *UPGRADE TO PREMIUM MEMBERSHIP (VIP TIER)*\n\n` +
          `🔥 Remove sponsored advertisement screens and unlock unlimited instant video delivery instantly, 24/7!\n\n` +
          `👑 *Premium Perks:*\n` +
          `- Zero waiting. No annoying ad delays!\n` +
          `- Infinite VIP downloads per day.\n` +
          `- Access premium course videos sourced from VIP group!\n\n` +
          `💵 *Active Plan Rates (Indian Rupees - INR):*\n` +
          `• 1 Day VIP Access: ₹${config.price1Day || 29}\n` +
          `• 3 Days VIP Access: ₹${config.price3Days || 59}\n` +
          `• 7 Days VIP Access: ₹${config.price7Days || 99}\n` +
          `• 30 Days VIP Access (Monthly): ₹${config.price30Days || 299}\n\n` +
          `💳 Select a simulated plan to checkout instantly:`,
          [
            { text: `💳 1 Day Access (₹${config.price1Day || 29})`, callback: "simulate_premium_buy_1d" },
            { text: `💳 3 Days Access (₹${config.price3Days || 59})`, callback: "simulate_premium_buy_3d" },
            { text: `💳 7 Days Access (₹${config.price7Days || 99})`, callback: "simulate_premium_buy_7d" },
            { text: `💳 Monthly Access (₹${config.price30Days || 299})`, callback: "simulate_premium_buy_30d" },
            { text: "🔙 Main Menu", callback: "verify_join" }
          ]
        );
      }, 500);
    }

    else if (callback.startsWith("simulate_premium_buy_")) {
      const plan = callback.split("_")[3]; // "1d", "3d", "7d", "30d"
      let planDays = 1;
      let planTitle = "1 Day VIP Plan";
      let costAmt = config.price1Day || 29;

      if (plan === "3d") {
        planDays = 3;
        planTitle = "3 Days VIP Plan";
        costAmt = config.price3Days || 59;
      } else if (plan === "7d") {
        planDays = 7;
        planTitle = "7 Days VIP Plan";
        costAmt = config.price7Days || 99;
      } else if (plan === "30d") {
        planDays = 30;
        planTitle = "30 Days VIP Plan (Monthly)";
        costAmt = config.price30Days || 299;
      }

      const activeCheckout = { plan, title: planTitle, cost: costAmt, days: planDays };
      setSimCheckoutPlan(activeCheckout);
      triggerSimulationLog("info", `User @${simUser.username} initiated checkout for ${planTitle} (₹${costAmt}). Loading scannable UPI QR...`);

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=upi://pay?pa=mddilmohamad01@ybl%26pn=Canara%26am=${costAmt}%26tn=Premium%20Bypass`;

      setTimeout(() => {
        appendChatMessage(
          "bot",
          `💳 *UPI PAYMENT CHECKOUT (CANARA BANK)*\n\n` +
          `Scan the QR code below instantly to pay *₹${costAmt}* via GPay, PhonePe, Paytm, or any standard UPI banking application:\n\n` +
          `🏦 *Bank Owner Account:* Canara Bank - 4075\n` +
          `🔑 *Your Payment UPI ID:* \`mddilmohamad01@ybl\`\n` +
          `💰 *Amount Requested:* ₹${costAmt} (${planTitle})\n\n` +
          `📌 *MANUAL SCREENSHOT ACTION REQUIRED:*\n` +
          `After payment is cleared, please upload a screenshot of your receipt. Click the button below to **upload your simulated screenshot** to the Owner desk for manual verification:`,
          [
            { text: "📤 Upload Simulated Screenshot", callback: "simulate_screenshot_upload" },
            { text: "🔙 main Premium Rates", callback: "get_premium" }
          ],
          undefined,
          false,
          qrCodeUrl
        );
      }, 500);
    }

    else if (callback === "simulate_screenshot_upload") {
      if (!simCheckoutPlan) {
        appendChatMessage("bot", "❌ *Session expired!* Please choose a premium plan first.");
        return;
      }

      appendChatMessage("user", "📤 Uploading successful transaction screenshot...");
      triggerSimulationLog("info", `Uploading simulated receipt image for "${simCheckoutPlan.title}"...`);

      const screenshotToSubmit = paymentFile.base64 || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400";
      const screenshotLabel = paymentFile.name || "default_canara_upi_receipt.png";

      if (!paymentFile.base64) {
        triggerSimulationLog("info", "No custom file loaded. Sourced default transactional template receipt.");
      }

      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: simUser.userId,
            username: simUser.username,
            planName: simCheckoutPlan.title,
            cost: simCheckoutPlan.cost,
            days: simCheckoutPlan.days,
            screenshotUrl: screenshotToSubmit
          })
        });

        if (res.ok) {
          const updatedPayments = await res.json();
          setPayments(updatedPayments);
          setSimCheckoutPlan(null);
          setPaymentFile({ base64: "", name: "" });
          fetchLogs();

          setTimeout(() => {
            appendChatMessage(
              "bot",
              `📨 *Payment screenshot received check successfully!* (Receipt: \`${screenshotLabel}\`)\n\n` +
              `🕐 *Verification Status:* \`PENDING MANUAL CONFIRMATION ⏳\`\n\n` +
              `Thank you! Your payment ticket has been routed to Owner/Admin @CHAT_VIP123 and forwarded directly to the telegram group!\n\n` +
              `💡 *How to approve this:* Click on the **"💎 Pending VIP Approvals"** tab at the top of the webpage, where this receipt is waiting. Click **"Approve"** to activate premium instantly!`,
              [
                { text: "👤 Check Profile Status", callback: "my_profile" },
                { text: "🔙 main Menu", callback: "verify_join" }
              ]
            );
          }, 600);
        }
      } catch (err) {
        console.error("Failed uploading mock screenshot receipt", err);
      }
    }

    else if (callback === "fake_video_download") {
      // Find current selected video
      const activeVideoFile = videos[simUser.currentVideoIndex || 0] || videos[0];
      if (!activeVideoFile) {
        appendChatMessage("bot", "⚠️ *No video files found!* Please create video items in the library first.");
        return;
      }

      // Check tier permission constraints
      if (activeVideoFile.tier === "premium" && !simUser.isPremium) {
        appendChatMessage("bot", "❌ *VIP Access Denied!*\n\nThis video belongs to the VIP premium courses. Please purchase a VIP Premium plan to unlock streaming & downloading rights.");
        return;
      }

      appendChatMessage("user", `📥 Download course file: ${activeVideoFile.title}`);
      triggerSimulationLog("info", `Assembling peer bypass on-board tunnel for "${activeVideoFile.title}"...`);

      setDownloadsQueue({
        active: true,
        progress: 5,
        video: activeVideoFile,
        speed: parseFloat((12 + Math.random() * 10).toFixed(1))
      });

      let currentProg = 5;
      const downloadInterval = setInterval(() => {
        currentProg += 15;
        if (currentProg >= 100) {
          currentProg = 100;
          clearInterval(downloadInterval);
          triggerSimulationLog("success", `Successfully assembled local buffer for: "${activeVideoFile.title}". File streaming active on-board.`);
        }
        setDownloadsQueue(prev => ({
          ...prev,
          progress: currentProg
        }));
      }, 350);
    }
  };

  const serveSimulatedVideo = (premium: boolean, indexChange: number = 0) => {
    const userTier = premium ? "premium" : "free";
    // Filter videos by current user tier
    let filteredVids = videos.filter(v => v.tier === userTier);
    if (filteredVids.length === 0) {
      if (premium) {
        filteredVids = videos;
      } else {
        filteredVids = videos.filter(v => v.tier === "free");
      }
    }

    if (filteredVids.length === 0) {
      appendChatMessage("bot", "⚠️ Sorry, there are currently no video items in the admin control board! Go to 'Manage Videos' tab to add video assets.");
      return;
    }

    let targetIndex = simUser.currentVideoIndex !== undefined ? simUser.currentVideoIndex : 0;
    targetIndex = targetIndex + indexChange;

    if (targetIndex < 0) {
      targetIndex = filteredVids.length - 1;
    } else if (targetIndex >= filteredVids.length) {
      targetIndex = 0;
    }

    setSimUser(prev => ({ ...prev, currentVideoIndex: targetIndex }));

    const chosenVideo = filteredVids[targetIndex];
    
    triggerSimulationLog("success", `Dispatched ${userTier} tier video content [${targetIndex + 1}/${filteredVids.length}] "${chosenVideo.title}" to client screen.`);
    
    // Clean caption: No promo referral channels urls below video, only title and description
    appendChatMessage(
      "bot",
      `🎬 *${chosenVideo.title}*\n\n` +
      `ℹ️ *Description:* ${chosenVideo.description || "No description provided."}`,
      [
        { text: "⏮️ Prev Video", callback: "prev_vid" },
        { text: "⏭️ Next Video", callback: "next_vid" },
        { text: "📥 Download Video directly on Board", callback: "fake_video_download" },
        { text: "🎰 Get Random Video", callback: "random_vid" },
        { text: "👤 Return to Profile Overview", callback: "my_profile" }
      ],
      chosenVideo,
      premium
    );
  };

  // Scroll to bottom helper for TG Chat interface
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSimAdActive]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="main_container">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4" id="app_header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
            <Bot size={28} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              Telegram Bot Builder
              <span className="text-xs bg-emerald-500/10 text-emerald-600 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Active Polling Engine Ready
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Configure, simulate, and deploy a professional 24/7 video and ad-verified Telegram Bot</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https:t.me/REHAN_BHAI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all"
          >
            <ExternalLink size={14} />
            Support Dev Channel
          </a>
          <button 
            onClick={fetchState}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
            title="Refresh logs and info"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8" id="workspace_layout">
        
        {/* Left column (Settings & Config) */}
        <section className="xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="settings_section">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Settings className="text-blue-600" size={20} />
            <h2 className="text-base font-semibold text-slate-900">Bot Service & Ads Setup</h2>
          </div>

          <form onSubmit={handleSaveConfig} className="flex flex-col gap-5">
            {/* TOKEN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 tracking-wide flex items-center justify-between">
                <span>TELEGRAM BOT TOKEN</span>
                <span className="text-[10px] text-amber-600 font-normal">Requires 24/7 Deployment token</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Paste your Telegram bot API Token here..."
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 font-mono text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                />
                <HelpCircle className="absolute right-3 top-3 text-slate-400" size={16} title="Generate this token via telegram's @BotFather bot." />
              </div>
            </div>

            {/* BOT OWNER USERNAME */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 tracking-wide flex items-center justify-between">
                <span>👑 BOT OWNER USERNAME</span>
                <span className="text-[10px] text-blue-600 font-normal">Owns exclusive upload & control rights</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium">@</span>
                <input
                  type="text"
                  placeholder="ONECORE_OWNER"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-2.5 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={config.ownerUsername || ""}
                  onChange={(e) => setConfig({ ...config, ownerUsername: e.target.value.replace("@", "").trim() })}
                />
              </div>
            </div>

            {/* CHANNEL DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wide">MANDATORY CHANNEL</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={config.channelUsername}
                    onChange={(e) => setConfig({ ...config, channelUsername: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wide">CHANNEL INVITE LINK</label>
                <input
                  type="url"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={config.channelInviteLink}
                  onChange={(e) => setConfig({ ...config, channelInviteLink: e.target.value })}
                />
              </div>
            </div>

            {/* FREE & PREMIUM VIDEOS SOURCE LINKS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wide flex justify-between">
                  <span>FREE VIDEO CHANNEL (मुफ़्त चैनल)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 outline-none focus:border-blue-500"
                  value={config.freeChannelUrl || ""}
                  placeholder="e.g. https://t.me/ytx12_b"
                  onChange={(e) => setConfig({ ...config, freeChannelUrl: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wide flex justify-between">
                  <span>PAID GROUP/CHANNEL (पेड ग्रुप)</span>
                </label>
                <input
                  type="text"
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 outline-none focus:border-blue-500"
                  value={config.paidChannelUrl || ""}
                  placeholder="e.g. https://t.me/ytx12_b"
                  onChange={(e) => setConfig({ ...config, paidChannelUrl: e.target.value })}
                />
              </div>
            </div>

            {/* INR SUBSCRIPTION RATES */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/70 flex flex-col gap-3">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
                <span>VIP PLAN RATES (₹ INR)</span>
                <span className="text-[10px] text-blue-600 normal-case font-normal">Sells premium access</span>
              </span>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">1 DAY (₹)</span>
                  <input
                    type="number"
                    className="w-full text-sm bg-white border border-slate-200 rounded px-2 text-slate-800 font-medium py-1.5"
                    value={config.price1Day || 29}
                    onChange={(e) => setConfig({ ...config, price1Day: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">3 DAYS (₹)</span>
                  <input
                    type="number"
                    className="w-full text-sm bg-white border border-slate-200 rounded px-2 text-slate-800 font-medium py-1.5"
                    value={config.price3Days || 59}
                    onChange={(e) => setConfig({ ...config, price3Days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">7 DAYS (₹)</span>
                  <input
                    type="number"
                    className="w-full text-sm bg-white border border-slate-200 rounded px-2 text-slate-800 font-medium py-1.5"
                    value={config.price7Days || 99}
                    onChange={(e) => setConfig({ ...config, price7Days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">30 DAYS (₹)</span>
                  <input
                    type="number"
                    className="w-full text-sm bg-white border border-slate-200 rounded px-2 text-slate-800 font-medium py-1.5"
                    value={config.price30Days || 299}
                    onChange={(e) => setConfig({ ...config, price30Days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* AD PARAMETERS & VIDEO NUMBERS */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">AD DURATION</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full text-sm bg-white border border-slate-100 rounded px-2 py-1 text-slate-700 font-medium focus:border-blue-500 outline-none"
                    value={config.adDuration}
                    onChange={(e) => setConfig({ ...config, adDuration: parseInt(e.target.value) || 2 })}
                  />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">SEC</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">FREE LIMIT</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full text-sm bg-white border border-slate-100 rounded px-2 py-1 text-slate-700 font-medium focus:border-blue-500 outline-none"
                    value={config.videoLimit}
                    onChange={(e) => setConfig({ ...config, videoLimit: parseInt(e.target.value) || 10 })}
                  />
                  <span className="text-[10px] text-slate-500 font-semibold">VIDS</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">RESET LIMIT</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    className="w-full text-sm bg-white border border-slate-100 rounded px-2 py-1 text-slate-700 font-medium focus:border-blue-500 outline-none"
                    value={config.resetHours}
                    onChange={(e) => setConfig({ ...config, resetHours: parseInt(e.target.value) || 12 })}
                  />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">HRS</span>
                </div>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-2.5 rounded-xl text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                  isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }`}
                id="update_config_button"
              >
                {isSaving ? "Upgrading engine parameters..." : "Apply & Update Bot Settings"}
                <ArrowRight size={16} />
              </button>
            </div>
            
            {/* Config alert callbacks */}
            <AnimatePresence>
              {saveStatus === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium"
                >
                  <CheckCircle2 size={16} />
                  Bot settings saved successfully on database & hot-swapped online.
                </motion.div>
              )}
              {saveStatus === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-50 text-red-700 border border-red-500/20 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium"
                >
                  <AlertCircle size={16} />
                  Could not update core backend module parameters. Try again.
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Quick-Stats Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50 mt-auto flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Cpu size={14} className="text-amber-500" />
              Runtime Operations Tracker
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border-r border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Database Status</span>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                  SQLite/JSON DB
                </span>
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-slate-500 font-medium block">Ad verifying service</span>
                <span className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                  <Tv size={14} />
                  Interactive Wait
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-lg p-3 text-[11px] text-slate-500 italic mt-1 leading-relaxed">
              If your real-time channel check fails, please ensure your newly configured Telegram Bot is registered as an <strong>Administrator</strong> inside the <strong className="text-blue-600">{config.channelUsername}</strong> channel.
            </div>
          </div>
        </section>

        {/* Center/Right Combined Frame */}
        <div className="xl:col-span-8 flex flex-col gap-6" id="playground_main">
          
          {/* Main Action Tabs */}
          <div className="flex border-b border-slate-200 text-sm font-medium gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-white text-blue-600 shadow-xs text-xs font-bold md:text-sm"
                  : "text-slate-600 hover:text-slate-900 text-xs md:text-sm"
              }`}
            >
              <Cpu size={16} />
              Bot Device Simulator
            </button>
            
            <button
              onClick={() => setActiveTab("library")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "library"
                  ? "bg-white text-blue-600 shadow-xs text-xs font-bold md:text-sm"
                  : "text-slate-600 hover:text-slate-900 text-xs md:text-sm"
              }`}
            >
              <Video size={16} />
              Manage Videos ({videos.length})
            </button>

            <button
              onClick={() => { setActiveTab("approvals"); fetchPayments(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "approvals"
                  ? "bg-white text-blue-600 shadow-xs text-xs font-bold md:text-sm"
                  : "text-slate-600 hover:text-slate-900 text-xs md:text-sm"
              }`}
            >
              <ShieldCheck size={16} className={payments.filter(p => p.status === "pending").length > 0 ? "text-amber-500 animate-pulse" : "text-slate-500"} />
              VIP Approvals ({payments.filter(p => p.status === "pending").length})
            </button>

            <button
              onClick={() => { setActiveTab("users"); fetchState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-white text-blue-600 shadow-xs text-xs font-bold md:text-sm"
                  : "text-slate-600 hover:text-slate-900 text-xs md:text-sm"
              }`}
            >
              <Users size={16} />
              Owner Stats & Users ({Object.keys(users).length})
            </button>
            
            <button
              onClick={() => setActiveTab("deploy")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "deploy"
                  ? "bg-white text-blue-600 shadow-xs text-xs font-bold md:text-sm"
                  : "text-slate-600 hover:text-slate-900 text-xs md:text-sm"
              }`}
            >
              <Github size={16} />
              24/7 Hosting Instructions
            </button>
          </div>

          {/* TAB 1: INTERACTIVE SIMULATOR */}
          {activeTab === "simulator" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="simulator_tab_frame">
              
              {/* Simulator Mobile device frame */}
              <div className="lg:col-span-7 flex flex-col items-center">
                
                {/* Simulated Channel Subscriptions Widget controller */}
                <div className="w-full bg-slate-900 text-white p-3 rounded-2xl mb-4 border border-slate-800 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isSimJoined ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
                    <span className="text-xs font-semibold">Simulated User Channel Membership:</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isSimJoined ? (
                      <button
                        onClick={() => {
                          setIsSimJoined(true);
                          setIsSimJoiningChannel(false);
                          appendChatMessage("system", `User joined channel ${config.channelUsername} successfully!`);
                          triggerSimulationLog("success", `User @${simUser.username} manually joined channel ${config.channelUsername} inside simulator.`);
                        }}
                        className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        👥 Simulate Join Button
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsSimJoined(false);
                          setSimUser(p => ({ ...p, isVerified: false }));
                          appendChatMessage("system", `User left channel ${config.channelUsername}.`);
                          triggerSimulationLog("warning", `User @${simUser.username} left channel ${config.channelUsername} state.`);
                        }}
                        className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        ❌ Leave Channel
                      </button>
                    )}
                  </div>
                </div>

                {/* Smartphone Device container */}
                <div className="w-[330px] md:w-[350px] h-[580px] bg-slate-950 border-4 border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative" id="smartphone_wrapper">
                  
                  {/* On-Board Cinema & Video Downloader Overlay */}
                  {downloadsQueue.active && (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col p-5 z-30 justify-between">
                      
                      {/* Header controls */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping"></span>
                          <span className="text-[10px] font-bold text-sky-400 font-mono uppercase tracking-widest">Active Downloader</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDownloadsQueue(prev => ({ ...prev, active: false }))}
                          className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Player Frame / Progress indicator */}
                      <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
                        {downloadsQueue.progress < 100 ? (
                          <div className="w-full flex flex-col items-center gap-4">
                            <div className="relative w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                              <span className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500 animate-spin opacity-40"></span>
                              <Plus className="text-blue-400 animate-pulse" size={28} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                                {downloadsQueue.video?.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-1">Downloading directly bypasses link redirection...</p>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full max-w-[240px] mt-2">
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                                  style={{ width: `${downloadsQueue.progress}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-1.5">
                                <span>{downloadsQueue.progress}% Complete</span>
                                <span>🚀 {downloadsQueue.speed} MB/s</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center gap-4">
                            {/* Loaded interactive media video placeholder element */}
                            <div className="w-full h-36 rounded-md border border-slate-800 bg-slate-900 overflow-hidden relative flex flex-col items-center justify-center">
                              <video
                                src={downloadsQueue.video?.url || "https://www.w3schools.com/html/mov_bbb.mp4"}
                                controls
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-left w-full px-2">
                              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">Verified</span>
                                {downloadsQueue.video?.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-1 line-clamp-2">
                                {downloadsQueue.video?.description || "No descriptions specified for this item."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Direct Save Action keys */}
                      <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                        {downloadsQueue.progress === 100 ? (
                          <button
                            type="button"
                            onClick={() => {
                              triggerSimulationLog("success", `File download complete! Saved movie package for: "${downloadsQueue.video?.title}" successfully.`);
                              // Trigger a local text file mock saving to be nice
                              const element = document.createElement("a");
                              const file = new Blob([`Title: ${downloadsQueue.video?.title}\nURL: ${downloadsQueue.video?.url}\nDescription: ${downloadsQueue.video?.description}`], {type: 'text/plain'});
                              element.href = URL.createObjectURL(file);
                              element.download = `${downloadsQueue.video?.title || "vip_class"}.txt`;
                              document.body.appendChild(element);
                              element.click();
                              document.body.removeChild(element);
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center rounded-xl text-xs flex items-center justify-center gap-1.5 uppercase tracking-wide transition-colors cursor-pointer border border-emerald-700 font-sans"
                          >
                            Save direct to Computer
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 bg-slate-800 text-slate-500 text-xs font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-700 font-mono"
                          >
                            Assembling cache stream...
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDownloadsQueue(prev => ({ ...prev, active: false }))}
                          className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer font-sans"
                        >
                          🔙 Hide Downloader
                        </button>
                      </div>

                    </div>
                  )}
                  
                  {/* Speaker & Sensor */}
                  <div className="absolute top-2 w-[130px] h-4 bg-slate-800 rounded-full left-1/2 -translate-x-1/2 z-30 flex items-center justify-center p-1">
                    <span className="w-12 h-1 bg-slate-900 rounded-full"></span>
                  </div>

                  {/* TG Custom Header */}
                  <div className="bg-slate-900 text-white pt-8 pb-3 px-4 shadow-sm flex items-center justify-between gap-2 border-b border-slate-800 z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold relative">
                        <Bot size={18} />
                        <span className="absolute bottom-0 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">Video Verify Bot</h3>
                        <p className="text-[10px] text-sky-400 font-medium">bot • active now</p>
                      </div>
                    </div>

                    <button 
                      onClick={resetSimulation}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Reset Session state"
                    >
                      <ListRestart size={14} />
                    </button>
                  </div>

                  {/* Chat Messages Scrolling Surface */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex flex-col gap-3 scrollbar-thin">
                    
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "user" ? "self-end" : msg.sender === "system" ? "self-center text-center w-full max-w-full" : "self-start"
                        }`}
                      >
                        {msg.sender === "system" ? (
                          <div className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-2.5 py-1 rounded-full my-1 inline-block mx-auto font-mono">
                            {msg.text}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {/* Message Bubble */}
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === "user" 
                                ? "bg-blue-600 text-white rounded-br-none" 
                                : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none"
                            }`}>
                              {/* If markdown profile state check */}
                              {msg.text.includes("👤 *") ? (
                                <div className="space-y-1">
                                  {msg.text.split("\n").map((line, i) => {
                                    if (line.startsWith("• ")) {
                                      return <p key={i} className="pl-2">🔹 {line.replace("• ", "")}</p>;
                                    }
                                    return <p key={i} className={line.startsWith("👤") ? "font-bold text-sky-300 text-xs border-b border-slate-800 pb-1 mb-2 block" : ""}>{line}</p>;
                                  })}
                                </div>
                              ) : (
                                <p className="whitespace-pre-line">{msg.text}</p>
                              )}

                              {/* If QR code payload exists */}
                              {msg.qrUrl && (
                                <div className="mt-2.5 bg-white p-3 text-center rounded-xl border border-slate-200 flex flex-col items-center gap-2">
                                  <img 
                                    src={msg.qrUrl} 
                                    alt="UPI QR Code" 
                                    referrerPolicy="no-referrer"
                                    className="w-36 h-36 object-contain rounded-lg border border-slate-100"
                                  />
                                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest">Canara Bank • Scan to Pay</span>

                                  {/* Dynamic User Custom Screenshot Uploader */}
                                  <div className="w-full mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-left">
                                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">📤 Select Receipt Screenshot:</span>
                                    
                                    <input
                                      type="file"
                                      accept="image/*"
                                      id="sim_screenshot_input"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setPaymentFile({
                                              base64: reader.result as string,
                                              name: file.name
                                            });
                                            triggerSimulationLog("success", `Custom payment snapshot loaded: "${file.name}"`);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />

                                    {paymentFile.name ? (
                                      <div className="w-full bg-emerald-50 text-emerald-800 text-[10px] p-2 rounded-lg border border-emerald-100 flex flex-col gap-1 text-left">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold truncate max-w-[120px]">📎 {paymentFile.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPaymentFile({ base64: "", name: "" })}
                                            className="text-red-500 hover:text-red-700 font-bold text-[8px] uppercase font-mono"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                        <img src={paymentFile.base64} alt="Screenshot Preview" className="w-full h-14 object-cover rounded-md mt-1 border border-emerald-150" />
                                      </div>
                                    ) : (
                                      <label
                                        htmlFor="sim_screenshot_input"
                                        className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-center text-[10px] transition-colors cursor-pointer border border-blue-100 flex items-center justify-center gap-1"
                                      >
                                        📁 Choose Image File...
                                      </label>
                                    )}

                                    {/* Quick testing presets */}
                                    <div className="w-full flex items-center justify-between gap-1.5 mt-1 border-t border-slate-50 pt-1.5">
                                      <span className="text-[8px] text-slate-400 font-medium">Quick presets:</span>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPaymentFile({
                                              base64: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
                                              name: "gpay_success_receipt.png"
                                            });
                                            triggerSimulationLog("success", "Loaded GooglePay mock receipt template!");
                                          }}
                                          className="text-[8px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                        >
                                          📱 GPay Demo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPaymentFile({
                                              base64: "https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=400",
                                              name: "phonepe_tx_cleared.jpg"
                                            });
                                            triggerSimulationLog("success", "Loaded PhonePe mock receipt template!");
                                          }}
                                          className="text-[8px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                                        >
                                          📱 PhonePe Demo
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              )}

                              {/* If video payload exists */}
                              {msg.videoPayload && (
                                <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-2">
                                  <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                                    <Video size={14} className="text-amber-400" />
                                    <span className="font-semibold text-slate-200 text-[11px] truncate">{msg.videoPayload.title}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{msg.videoPayload.description}</p>
                                  
                                  {/* Simulated Visual Video Display frame */}
                                  <div className="w-full h-24 bg-slate-900 rounded-md ring-1 ring-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                                    <video 
                                      className="absolute inset-0 w-full h-[150%] object-cover pointer-events-none opacity-50"
                                      src={msg.videoPayload.url}
                                      muted
                                      loop
                                      autoPlay
                                    />
                                    <div className="absolute inset-0 bg-slate-950/40 font-mono text-[9px] text-amber-400 uppercase flex items-center justify-center flex-col gap-1 z-10 font-bold">
                                      <span>🎥 Video Active</span>
                                      <span className="text-[8px] text-slate-300 font-normal underline">{msg.videoPayload.url.substring(0, 30)}...</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Options Button arrays */}
                            {msg.buttons && msg.buttons.length > 0 && (
                              <div className="flex flex-col gap-1.5 mt-2">
                                {msg.buttons.map((btn, i) => (
                                  btn.url ? (
                                    <a
                                      key={i}
                                      href={btn.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => {
                                        if (btn.callback === "join_channel_url") {
                                          setIsSimJoined(true);
                                          appendChatMessage("system", `Automatically joined and registered under ${config.channelUsername}`);
                                        }
                                      }}
                                      className="w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      {btn.text}
                                      <ExternalLink size={12} />
                                    </a>
                                  ) : (
                                    <button
                                      key={i}
                                      onClick={() => handleSimCallback(btn.callback)}
                                      className="w-full py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-100 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                                    >
                                      {btn.text}
                                    </button>
                                  )
                                ))}
                              </div>
                            )}

                            {/* Timestamp */}
                            <span className="text-[9px] text-slate-500 px-1 self-start">{msg.timestamp}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Infinite progress tracker or ad trigger */}
                    {isSimAdActive && (
                      <div className="absolute inset-x-4 top-20 bottom-16 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl border border-slate-800">
                        <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center mb-4 animate-bounce border border-blue-500/20">
                          <Tv size={32} />
                        </div>
                        <h4 className="text-sm font-bold text-white tracking-wide uppercase">Sponsored Message Ad</h4>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Please watch this ad to unlock free videostream downloads.<br />
                          Ad credit sponsored by <strong className="text-blue-400">{config.channelUsername}</strong>
                        </p>

                        <div className="mt-6 flex flex-col items-center gap-2">
                          <span className="text-3xl font-extrabold text-white bg-slate-900 border border-slate-800 w-14 h-14 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            {simAdCountdown}s
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-2 font-semibold">Generating Video Package...</span>
                        </div>
                      </div>
                    )}

                    <div ref={chatBottomRef} />
                  </div>

                  {/* Device Bottom Interaction Console Keyboard */}
                  <div className="bg-slate-900 p-3 border-t border-slate-800 flex flex-col gap-2">
                    {/* Bot Quick command key suggestion */}
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      <button
                        onClick={() => handleSimInput("/start")}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-2 py-1 rounded transition-colors cursor-pointer border border-slate-700"
                      >
                        ⚡ /start
                      </button>
                      <button
                        onClick={() => handleSimInput("/paid_user get_video bot_upload")}
                        className="text-[10px] bg-sky-950 hover:bg-sky-900 text-sky-200 font-medium px-2 py-1 rounded transition-colors cursor-pointer border border-sky-800"
                        title="Command: /paid_user get_video bot_upload"
                      >
                        💎 VIP /paid_user
                      </button>
                      <button
                        onClick={() => handleSimInput("/free_user get_video bot_upload")}
                        className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-200 font-medium px-2 py-1 rounded transition-colors cursor-pointer border border-emerald-800"
                        title="Command: /free_user get_video bot_upload"
                      >
                        🆓 Free /free_user
                      </button>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!simTextInput.trim()) return;
                        handleSimInput(simTextInput);
                        setSimTextInput("");
                      }}
                      className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1"
                    >
                      <input
                        type="text"
                        placeholder="Type command /addvideo or paste link..."
                        className="flex-1 bg-transparent border-none text-[11px] outline-none text-slate-200 py-1.5 focus:ring-0"
                        value={simTextInput}
                        onChange={(e) => setSimTextInput(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        disabled={!simTextInput.trim()} 
                        className="text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Send size={12} />
                      </button>
                    </form>
                  </div>

                </div>
              </div>

              {/* Real-time Streaming Logs panel */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex-1 flex flex-col shadow-lg overflow-hidden min-h-[460px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal size={18} className="text-yellow-500" />
                      <h3 className="text-sm font-semibold tracking-wide uppercase">Realtime Engine Logs</h3>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                      <button 
                        onClick={handleClearLogs}
                        className="text-[10px] bg-rose-600/10 text-rose-400 hover:bg-rose-600 hover:text-white font-medium px-2 py-1 rounded transition-all"
                      >
                        Clear console
                      </button>
                    </div>
                  </div>

                  {/* Log scroll wrapper */}
                  <div className="flex-1 p-3 bg-slate-950 rounded-xl border border-slate-800 mt-4 overflow-y-auto max-h-[380px] font-mono text-xs flex flex-col-reverse gap-2.5 scrollbar-thin">
                    {logs.map((log) => {
                      const levelColors = {
                        info: "text-slate-400 border-slate-800/55",
                        success: "text-emerald-400 border-emerald-950/50 bg-emerald-950/20",
                        warning: "text-amber-400 border-amber-950/50 bg-amber-950/20",
                        error: "text-red-400 border-red-950 bg-red-950/30"
                      };
                      return (
                        <div 
                          key={log.id} 
                          className={`p-2 rounded border leading-relaxed ${levelColors[log.level]}`}
                        >
                          <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 select-none font-bold">
                            <span>[{log.level.toUpperCase()}]</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="font-semibold text-[11px] whitespace-pre-wrap">{log.message}</p>
                        </div>
                      );
                    })}

                    {logs.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-600 text-center flex-col py-24 select-none">
                        <Terminal size={24} className="mb-2 opacity-50" />
                        <span>No server events recorded yet.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Stats Cards info */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" />
                    How to Test Simulation
                  </span>
                  <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>Click <strong className="text-slate-800">⚡ Press /start Command</strong> key inside the phone device frame.</li>
                    <li>Toggle user subscriptions status with the <strong className="text-blue-600">👥 Simulate Join Button</strong> above the phone.</li>
                    <li>Press <strong className="text-slate-800">✅ Verify Verification</strong> to register as member.</li>
                    <li>Retrieve content using <strong className="text-slate-800">🎬 Get Video</strong> or activate the <strong className="text-sky-500">💎 Premium Plan</strong> to skip ad frames!</li>
                  </ol>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MANAGE VIDEOS */}
          {activeTab === "library" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="library_tab_frame">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Video size={18} className="text-blue-600" />
                  Admin Video Library Management
                </h3>
                <p className="text-xs text-slate-500 mt-1">Upload title details, references, and descriptions of video assets that the Telegram Bot serves randomly.</p>
              </div>

              {/* Add Video Form wrapper */}
              <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Video Title</label>
                  <input
                    type="text"
                    placeholder="Enter visual title (e.g. Tutorial Introduction...)"
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  />
                </div>

                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Video Source URL or File ID</label>
                  <input
                    type="text"
                    placeholder="Provide mp4 URL or Telegram File ID link"
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono outline-none focus:border-blue-500"
                    value={newVideo.url}
                    onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Target User Tier</label>
                  <select
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-2.5 text-slate-700 outline-none focus:border-blue-500 font-medium"
                    value={newVideo.tier}
                    onChange={(e) => setNewVideo({ ...newVideo, tier: e.target.value })}
                  >
                    <option value="free">🆓 Free Tier Video</option>
                    <option value="premium">💎 Premium VIP Video</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={isUploadingFile}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer h-[38px]"
                  >
                    <Plus size={14} />
                    {isUploadingFile ? "Uploading File..." : "Add Video"}
                  </button>
                </div>

                 <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/60 p-3 rounded-lg border border-slate-200/50">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Option B: Upload Video Files directly (Select Multiple, .mp4 up to 20MB each)</label>
                    <input
                      type="file"
                      accept="video/mp4,video/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={isUploadingFile}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-col gap-1.5 text-xs text-slate-700 font-medium">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">📎 Selected Files ({selectedFiles.length} items ready to save):</span>
                      <div className="max-h-[85px] overflow-y-auto space-y-1 bg-white p-2 rounded border border-slate-200">
                        {selectedFiles.map((fileObj, fIdx) => (
                          <div key={fIdx} className="flex items-center justify-between gap-2 text-[10px] text-slate-600 font-mono">
                            <span className="truncate">▫ {fileObj?.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, idx) => idx !== fIdx));
                              }}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFiles([]);
                          setNewVideo(prev => ({ ...prev, url: "" }));
                        }}
                        className="text-slate-500 hover:text-red-600 font-bold text-[9px] uppercase self-end cursor-pointer"
                      >
                        [Clear All Files]
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 self-center">No video files selected for direct upload. Standard text URLs/FileIDs work as normal.</p>
                  )}
                </div>

                <div className="md:col-span-12 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Short Video Description (Optional)</label>
                  <textarea
                    placeholder="Add brief details about what is taught in this video asset..."
                    rows={2}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  />
                </div>

                {videoFormError && (
                  <div className="md:col-span-12 text-xs text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {videoFormError}
                  </div>
                )}
              </form>

              {/* Bulk Upload Form Section */}
              <form onSubmit={handleBulkAdd} className="flex flex-col gap-4 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/80">
                <div className="border-b border-indigo-100/50 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Video size={16} className="text-indigo-600" />
                    Option C: Bulk Register Multiple Videos (Any Quantity - Up to 50 at once)
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Simply paste multiple course links (one per line) or use format <code>Title | URL | Short Description</code> to register 10, 20, or more items instantly.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">Enter Links or Format List (One Per Line, 10 to 50 items)</label>
                  <textarea
                    placeholder="Example:&#10;Tutorial 1 | https://t.me/ytx12_b/2 | Introduction chapter&#10;Bypass Setup | https://t.me/ytx12_b/3 | Core configuration&#10;Or simply paste links alone (one URL per line)"
                    rows={4}
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg p-3 text-slate-700 outline-none focus:border-indigo-500"
                    value={bulkVideoText}
                    onChange={(e) => setBulkVideoText(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-[10px] font-semibold text-slate-600">Add as Tier:</span>
                    <button
                      type="button"
                      onClick={() => setBulkTier("free")}
                      className={`px-3 py-1 text-[10px] font-medium rounded-full border transition-all ${bulkTier === "free" ? "bg-blue-50 text-blue-700 border-blue-200 shadow-3xs" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      🆓 Free Tier Videos
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTier("premium")}
                      className={`px-3 py-1 text-[10px] font-medium rounded-full border transition-all ${bulkTier === "premium" ? "bg-amber-50 text-amber-700 border-amber-200 shadow-3xs" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      💎 Premium VIP Videos
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isBulking}
                    className="py-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto h-[34px]"
                  >
                    <Plus size={14} />
                    {isBulking ? "Saving Bulk List..." : "Add Bulk Videos Now"}
                  </button>
                </div>

                {bulkError && (
                  <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {bulkError}
                  </div>
                )}
              </form>

              {/* Uploaded Videos List Displayed */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Saved Library ({videos.length})</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((vid) => (
                    <div 
                      key={vid.id} 
                      className="border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs flex flex-col justify-between gap-3 transition-colors bg-white hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex flex-col gap-1.5">
                            <h5 className="text-sm font-semibold text-slate-900 leading-tight">{vid.title}</h5>
                            <div className="flex gap-1.5 items-center flex-wrap">
                              <span className={`inline-flex items-center w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                vid.tier === "premium" 
                                  ? "bg-amber-100 text-amber-700 border border-amber-200" 
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}>
                                {vid.tier === "premium" ? "💎 PREMIUM VIP" : "🆓 FREE VIDEO"}
                              </span>
                              {vid.createdAt && (
                                <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 border border-red-100 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                                  ⏱️ Auto-delete: {Math.max(1, 10 - Math.floor((Date.now() - vid.createdAt) / 60000))}m
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(vid.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-mono truncate">{vid.url}</p>
                        {vid.description && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{vid.description}</p>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span>ID: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{vid.id}</code></span>
                        <a 
                          href={vid.url} 
                          target="_blank" 
                          className="text-blue-600 hover:underline flex items-center gap-0.5"
                          referrerPolicy="no-referrer"
                        >
                          Visual link
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}

                  {videos.length === 0 && (
                    <div className="col-span-2 text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                      <div className="p-3 bg-white rounded-full border border-slate-200 mb-2">
                        <Video size={18} className="text-slate-400" />
                      </div>
                      <span className="text-sm font-medium">Video library is completely empty.</span>
                      <span className="text-xs text-slate-500">Add some video references above to start serving files.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: OWNER STATS & USERS DIRECTORY */}
          {activeTab === "users" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="users_tab_frame">
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    👑 Bot Owner Control Desk & Statistics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage direct access, track subscription statuses, and monitor joined user numbers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchState}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Sync Directory
                  </button>
                </div>
              </div>

              {/* LIVE COUNTERS & STATS BANNER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="owner_stats_row">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Users size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Registered</span>
                    <span className="text-xl font-extrabold text-slate-800">{Object.keys(users).length} Users</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-150 rounded-xl flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <User size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Free Users Joined</span>
                    <span className="text-xl font-extrabold text-emerald-850">
                      {(Object.values(users) as UserSession[]).filter(u => !u.isPremium).length} 🆓
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-purple-50/60 border border-purple-150 rounded-xl flex items-center gap-3.5">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">VIP Paid Purchases</span>
                    <span className="text-xl font-extrabold text-purple-850">
                      {(Object.values(users) as UserSession[]).filter(u => u.isPremium).length} 💎
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-3.5">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <span className="text-xl">💰</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Simulated Inflow</span>
                    <span className="text-xl font-extrabold text-amber-900">
                      ₹{payments.filter(p => p.status === "approved").reduce((sum, current) => sum + current.cost, 0)} INR
                    </span>
                  </div>
                </div>
              </div>

              {/* SIMULATION AND QUICK CONTROL ACTION SECTION */}
              <div className="p-4 bg-blue-50/30 border border-blue-100/70 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Owner's Sandbox Testing Operations:</span>
                  <span className="text-[11px] text-slate-500 font-medium">Inject mock data into the server directory to visually verify automated premium conversion and storage.</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/users/simulate", { method: "POST" });
                        if (res.ok) {
                          const data = await res.json();
                          setUsers(data.users || {});
                          triggerSimulationLog("success", `[Owner] Auto-simulated a new free telegram user entry`);
                          fetchState();
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Simulate Free User Join
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      // Trigger a simulated screenshot submission
                      try {
                        const payResponse = await fetch("/api/payments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: Math.floor(1000000000 + Math.random() * 9000000000),
                            username: "sim_buyer_" + Math.random().toString(36).substring(2, 6),
                            planName: "7 Days Plan VIP",
                            cost: config.price7Days || 99,
                            days: 7,
                            screenshotUrl: "https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=400"
                          })
                        });
                        if (payResponse.ok) {
                          const payData = await payResponse.json();
                          setPayments(payData);
                          triggerSimulationLog("success", `[Owner] Random user automatically simulated UPI QR purchase receipt`);
                          setActiveTab("approvals");
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-505 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    👑 Simulate Payment Screenshot Incoming
                  </button>
                </div>
              </div>

              {/* MAIN FILTER CONTROLS */}
              <div className="flex border-b border-slate-100 pb-3 items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUserFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    All Users Directory ({Object.keys(users).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("free")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilter === "free" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    🆓 Free Members ({(Object.values(users) as UserSession[]).filter(u => !u.isPremium).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("premium")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilter === "premium" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    💎 VIP Members ({(Object.values(users) as UserSession[]).filter(u => u.isPremium).length})
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-medium">Owner Authorization Override Controls</span>
              </div>

              {/* LISTING */}
              <div className="flex flex-col gap-3">
                {Object.keys(users).length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl bg-slate-50 text-slate-400 text-xs">
                    No users connected yet. Sim user will register when interacting with Telegram.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.values(users) as UserSession[])
                      .filter(user => {
                        if (userFilter === "free") return !user.isPremium;
                        if (userFilter === "premium") return user.isPremium;
                        return true;
                      })
                      .map((user) => {
                        const isOwnerUser = user.userId.toString() === "7310228945" || user.username === config.ownerUsername;
                        return (
                          <div
                            key={user.userId}
                            className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                              isOwnerUser
                                ? "border-amber-300 bg-amber-500/[0.02]"
                                : user.isPremium
                                ? "border-purple-200 bg-purple-500/[0.01]"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  {isOwnerUser ? "👑 " : ""}@{user.username || "Anonymous"} 
                                  <span className="font-mono text-[9px] text-slate-400 font-normal">({user.userId})</span>
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  Verified Session: {user.isVerified ? "✅ True" : "❌ Channel Member Check Pending"}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  isOwnerUser
                                    ? "bg-amber-100 border-amber-300 text-amber-700"
                                    : user.isPremium
                                    ? "bg-purple-100 border-purple-200 text-purple-700"
                                    : "bg-emerald-50 border-emerald-150 text-emerald-700"
                                }`}
                              >
                                {isOwnerUser ? "Owner" : user.isPremium ? "💎 VIP Member" : "🆓 Free Tier"}
                              </span>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 grid grid-cols-2 gap-2 font-mono">
                              <div>
                                <span className="text-[8px] text-slate-400 block uppercase font-sans font-semibold">Video Limit Consumption</span>
                                <span className="font-semibold text-slate-700">{user.videoLimitUsed} / {config.videoLimit} Free plays</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 block uppercase font-sans font-semibold">Premium Availability Status</span>
                                <span className={`font-semibold ${user.isPremium ? "text-purple-600" : "text-emerald-600"}`}>
                                  {user.isPremium ? "Uncapped Access" : "Standard Limitations"}
                                </span>
                              </div>
                              {user.premiumExpiresAt && (
                                <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                                  <span className="text-[8px] text-slate-400 block uppercase font-sans font-semibold">Premium Expiration Timestamp</span>
                                  <span className="text-purple-600 font-semibold">{new Date(user.premiumExpiresAt).toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Owner Super Powers Override Actions */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/users/${user.userId}/toggle-premium`, { method: "POST" });
                                    if (response.ok) {
                                      const data = await response.json();
                                      setUsers(data.users || {});
                                      triggerSimulationLog("success", `Toggled premium state override for user @${user.username}`);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                                  user.isPremium
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-350"
                                    : "bg-purple-600 hover:bg-purple-500 text-white border-purple-700/10 shadow-xs"
                                }`}
                              >
                                {user.isPremium ? "⚠️ Downgrade to Free" : "⚡ Unlock VIP Access"}
                              </button>
                              
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Remove @${user.username} from bot cache?`)) {
                                    try {
                                      const response = await fetch(`/api/users/${user.userId}`, { method: "DELETE" });
                                      if (response.ok) {
                                        const data = await response.json();
                                        setUsers(data.users || {});
                                        triggerSimulationLog("warning", `Pruned user connection for @${user.username}`);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center"
                                title="Kick/Delete User"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 24/7 DEPLOYMENT ACTIONS */}
          {activeTab === "deploy" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="deploy_tab_frame">
              
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Github size={18} className="text-slate-900" />
                    Deploy & Run 24/7 on GitHub + Hosting
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Full developer guidance details in English to keep your verified Telegram Bot active endlessly.</p>
                </div>

                <div className="bg-slate-100 rounded-lg p-1.5 flex gap-1.5 text-xs font-semibold border border-slate-200">
                  <span className="bg-slate-900 text-white px-2.5 py-1 rounded">Hosting Guide</span>
                </div>
              </div>

              {/* Requirements & steps displayer */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Prerequisites Required For Your Bot
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-normal text-xs text-slate-600 leading-relaxed">
                  <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                    <h5 className="font-bold text-slate-900 text-sm mb-1">1. Telegram Bot Credentials</h5>
                    <p className="mb-2">You need a free Token generated by Telegram. Follow these steps:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Open Telegram and search for <strong className="text-blue-600">@BotFather</strong></li>
                      <li>Send command: <code className="bg-white px-1 border border-slate-200 rounded">/newbot</code></li>
                      <li>Provide a unique display name and username</li>
                      <li>Copy the generated HTTP API Token into our dashboard input for testing.</li>
                    </ul>
                  </div>

                  <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                    <h5 className="font-bold text-slate-900 text-sm mb-1">2. Verification Channel Admin</h5>
                    <p className="mb-2">To check if clients joined your channel, the bot needs to verify membership:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Create a public Telegram Channel (e.g., <strong className="text-indigo-600">@CHAT_VIP123</strong>)</li>
                      <li>Open Channel Settings &rarr; Administrators</li>
                      <li>Click "Add Admin" &rarr; Search for your Bot username</li>
                      <li>Grant basic permissions (especially 'Post Messages' and 'Invite Users') so it can request chat states.</li>
                    </ul>
                  </div>
                </div>

                {/* Steps Section content */}
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                  <Code size={14} className="text-indigo-600" />
                  Codebase & Hosting 24/7 Layout
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 border-b border-slate-800 space-y-3">
                    <div className="text-amber-400 font-bold border-b border-slate-800 pb-1 flex justify-between items-center text-xs">
                      <span>🤖 Production Ready index.js code</span>
                      <span className="text-[10px] text-slate-400 font-normal">Copy this file for GitHub</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre leading-relaxed select-all max-h-56 scrollbar-thin">
{`const TelegramBot = require('node-telegram-bot-api');

// Configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const PROMO_CHANNEL = "@CHAT_VIP123"; // Your channel username
const PROMO_LINK = "https://t.me/CHAT_VIP123"; // Your channel link
const LIMIT = 10;
const RESET_WINDOW = 12 * 60 * 60 * 1000; // 12 Hours (miliseconds)
const AD_DURATION = 3 * 1000; // 3 Seconds

const bot = new TelegramBot(TOKEN, { polling: true });

// InMemory User Session DB
const users = {}; 

// Video library 
const videos = [
  { id: "vid1", title: "Tutorial video 1", url: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

bot.onText(/\\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.chat.username || "User";
  
  if (!users[chatId]) {
    users[chatId] = { isVerified: false, videoLimitUsed: 0, resetAt: Date.now() + RESET_WINDOW, isPremium: false };
  }
  
  bot.sendMessage(chatId, \`👋 Hello @\${username}! Join our updates channel to unlock downloads:\n\${PROMO_CHANNEL}\`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 Join Channel", url: PROMO_LINK }],
        [{ text: "✅ Verify Verification", callback_data: "verify_join" }]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const username = query.message.chat.username || "User";
  
  if (!users[chatId]) {
    users[chatId] = { isVerified: false, videoLimitUsed: 0, resetAt: Date.now() + RESET_WINDOW, isPremium: false };
  }
  const session = users[chatId];
  
  if (data === "verify_join") {
    try {
      const member = await bot.getChatMember(PROMO_CHANNEL, chatId);
      const isJoined = ["member", "administrator", "creator"].includes(member.status);
      
      if (isJoined) {
        session.isVerified = true;
        bot.sendMessage(chatId, "🎉 Successfully Verified! Choose an action:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎬 Get Video", callback_data: "get_video" }],
              [{ text: "👤 Profile Status", callback_data: "my_profile" }, { text: "💎 Get Premium", callback_data: "get_premium" }]
            ]
          }
        });
      } else {
        bot.answerCallbackQuery(query.id, { text: "❌ You have not joined the channel yet!", show_alert: true });
      }
    } catch (e) {
      // Fallback if bot is not admin yet in channel
      session.isVerified = true;
      bot.sendMessage(chatId, "✅ Verified (Admin check override enabled). Choose option:", {
        reply_markup: { inline_keyboard: [[{ text: "🎬 Get Video", callback_data: "get_video" }]] }
      });
    }
  }
  
  else if (data === "get_video") {
    if (!session.isVerified) {
      return bot.sendMessage(chatId, "⚠️ Please verify your channel join first.");
    }
    
    // Auto reset limits check
    if (Date.now() > session.resetAt) {
      session.videoLimitUsed = 0;
      session.resetAt = Date.now() + RESET_WINDOW;
    }
    
    if (session.isPremium) {
      serveVideo(chatId, true);
    } else {
      if (session.videoLimitUsed >= LIMIT) {
        return bot.sendMessage(chatId, "❌ limit reached! Wait 12 hours or get Premium 💎 to skip limits.");
      }
      
      const waitMsg = await bot.sendMessage(chatId, "⏳ Watching sponsored ad (3 seconds)...");
      setTimeout(async () => {
        await bot.deleteMessage(chatId, waitMsg.message_id);
        session.videoLimitUsed += 1;
        serveVideo(chatId, false);
      }, AD_DURATION);
    }
  }
  
  else if (data === "my_profile") {
    const timeRemaining = Math.max(0, Math.ceil((session.resetAt - Date.now()) / (1000 * 60 * 60)));
    bot.sendMessage(chatId, \`👤 Profile:\\n\\n• Status: \${session.isPremium ? "Premium 💎" : "Free Tier"}\\n• Remaining Downloads: \${LIMIT - session.videoLimitUsed}/10\\n• Resets in: \${timeRemaining}h\`);
  }
  
  else if (data === "get_premium") {
    bot.sendMessage(chatId, "💎 Premium Plan: $4.99\\n\\n💳 Pay to simulate Premium status:", {
      reply_markup: { inline_keyboard: [[{ text: "Simulate Buy Now", callback_data: "process_premium" }]] }
    });
  }
  
  else if (data === "process_premium") {
    session.isPremium = true;
    bot.sendMessage(chatId, "💎 Premium activated successfully! Play videos ads-free.");
  }
});

function serveVideo(chatId, isPremium) {
  const vid = videos[0];
  bot.sendMessage(chatId, \`🍿 *Video Unlocked!*\\n\\n🎥 \${vid.title}\\n🔗 \${vid.url}\\n\\n\${isPremium ? "💎 Premium No Ads served." : "Free download processed (used 1/10)"}\`, { parse_mode: "Markdown" });
}`}
                    </pre>
                  </div>
                  <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <h5 className="font-bold text-slate-800 text-xs mb-1">How can I host this 24/7 on GitHub or external servers?</h5>
                    <ol className="text-xs text-slate-600 list-decimal pl-4 mt-2 space-y-2 leading-relaxed">
                      <li>
                        <strong>Create a Dedicated GitHub Repository:</strong>
                        <br /> Create a new repository on your GitHub account. Upload the <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">index.js</code> file above along with a basic <code className="bg-slate-100 px-1 py-0.5 rounded">package.json</code> declaring <code className="bg-slate-100 px-1 py-0.5 rounded">"node-telegram-bot-api": "^0.66.0"</code>.
                      </li>
                      <li>
                        <strong>Register for Free 24/7 cloud services:</strong>
                        <br /> Since GitHub itself does not host persistent live servers (unless using Actions workarounds, which are not suitable for real-time bots since Actions have execution timeout limits), we recommend hosting your code on free/low-cost persistent node environments such as <strong className="text-slate-800">Render.com</strong>, <strong className="text-slate-800">Replit</strong>, or <strong className="text-slate-800">Koyeb</strong>.
                      </li>
                      <li>
                        <strong>Fill your Environment Variables securely:</strong>
                        <br /> In your host dashboard settings (e.g. Render Dashboard), add a Secret variable named <code className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-1 py-0.5 rounded font-mono font-bold">TELEGRAM_BOT_TOKEN</code>. Set the value to your Bot API Token from @BotFather. This prevents leaking your credentials in your public repository code!
                      </li>
                      <li>
                        <strong>Boot the Instance:</strong>
                        <br /> The hosting platform will automatically run <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">node index.js</code>. Your bot will remain online 24/7 listening to Telegram inputs endlessly.
                      </li>
                    </ol>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: VIP SCREENSHOT APPROVALS */}
          {activeTab === "approvals" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="approvals_tab_frame">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-blue-600" />
                    Premium VIP Verification Panel
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage screenshot transaction receipts submitted by users. Approve them to unlock premium status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchPayments}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} className="animate-spin-slow" />
                  Refresh Queue
                </button>
              </div>

              {/* Payments queue layout */}
              <div className="flex flex-col gap-4">
                {payments.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                    <div className="p-4 bg-white rounded-full border border-slate-100 mb-3 shadow-xs">
                      <ShieldCheck size={28} className="text-slate-300" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">No payment entries found</span>
                    <span className="text-xs text-slate-500 mt-1">Initiate premium buys in the phone simulator or Telegram to populate screenshots.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {payments.map((pay) => {
                      const isPending = pay.status === "pending";
                      return (
                        <div
                          key={pay.id}
                          className={`border rounded-2xl p-5 shadow-xs flex flex-col gap-4 transition-all relative overflow-hidden ${
                            pay.status === "approved"
                              ? "border-emerald-200 bg-emerald-500/[0.01]"
                              : pay.status === "rejected"
                              ? "border-red-200 bg-red-500/[0.01]"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                          }`}
                        >
                          {/* Top Tag header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 leading-none">
                                @{pay.username}
                                <span className="font-mono text-[10px] text-slate-500 font-normal">({pay.userId})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">
                                Submitted {new Date(pay.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                                pay.status === "approved"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : pay.status === "rejected"
                                  ? "bg-red-50 border-red-200 text-red-600"
                                  : "bg-amber-50 border-amber-200 text-amber-600 animate-pulse"
                              }`}
                            >
                              {pay.status}
                            </span>
                          </div>

                          {/* Ticket Details */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Requested Item</span>
                              <span className="font-semibold text-slate-800">{pay.planName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Amount Paid</span>
                              <span className="font-extrabold text-emerald-600">₹{pay.cost} INR</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Access Duration</span>
                              <span className="font-semibold text-slate-800">{pay.days} Day(s)</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Bank Gateway</span>
                              <span className="font-semibold text-slate-800">Canara UPI QR (4075)</span>
                            </div>
                          </div>

                          {/* Image Box */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Screenshot Receipt:</span>
                            <div className="relative group w-full h-44 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/60 flex items-center justify-center">
                              <img
                                src={pay.screenshotUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400"}
                                alt="Payment Screenshot"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          </div>

                          {/* Admin decisions */}
                          {isPending ? (
                            <div className="flex gap-2.5 mt-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/payments/${pay.id}/approve`, { method: "POST" });
                                    const contentType = res.headers.get("content-type");
                                    if (res.ok && contentType && contentType.includes("application/json")) {
                                      const data = await res.json();
                                      setPayments(data);
                                      // If user approved is the simulated guest, unlock simulated profile too!
                                      if (pay.userId === simUser.userId) {
                                        setSimUser(prev => ({
                                          ...prev,
                                          isPremium: true,
                                          premiumExpiresAt: new Date(Date.now() + pay.days * 24 * 60 * 60 * 1000).toISOString()
                                        }));
                                        appendChatMessage(
                                          "bot",
                                          `👑 *YOUR PREMIUM VERIFIED ACCOUNT STATUS ACTIVE!*\n\n` +
                                          `Your payment receipt has been APPROVED by manual check of @CHAT_VIP123.\n` +
                                          `Enjoy unlimited VIP course speeds and video downloads streaming ads-free now!`,
                                          [
                                            { text: "🎬 Get Video (Ads-Free/VIP)", callback: "get_video" },
                                            { text: "👤 Return to Profile Overview", callback: "my_profile" }
                                          ]
                                        );
                                      }
                                      fetchLogs();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 border border-emerald-700/10 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Check size={14} /> Approve VIP Access
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/payments/${pay.id}/reject`, { method: "POST" });
                                    const contentType = res.headers.get("content-type");
                                    if (res.ok && contentType && contentType.includes("application/json")) {
                                      const data = await res.json();
                                      setPayments(data);
                                      if (pay.userId === simUser.userId) {
                                        appendChatMessage(
                                          "bot",
                                          `❌ *Payment Screenshot Declined*\n\n` +
                                          `The Owner declined manual verification for this receipt. Please double-check your billing details or upload again!\n\n` +
                                          `📞 *Support:* @CHAT_VIP123`
                                        );
                                      }
                                      fetchLogs();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold px-4 py-2.5 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`mt-1 py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border ${
                                pay.status === "approved"
                                  ? "bg-emerald-50/40 border-emerald-200/50 text-emerald-700"
                                  : "bg-rose-50/40 border-rose-200/50 text-rose-700"
                              }`}
                            >
                              ✅ Ticket closed with status code: {pay.status.toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* App Foot Margin credit block */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto" id="app_footer">
        <p>&copy; 2026 Telegram Video Verify Bot Dashboard • Continuous Delivery Hub</p>
      </footer>
    </div>
  );
}
