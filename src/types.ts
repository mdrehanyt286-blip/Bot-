export interface BotConfig {
  botToken: string;
  channelUsername: string; // e.g., "@CHAT_VIP123"
  channelInviteLink: string; // e.g., "https://t.me/CHAT_VIP123"
  adDuration: number; // in seconds (2-3s)
  videoLimit: number; // e.g., 10
  resetHours: number; // e.g., 12 hours
  freeChannelUrl?: string; // e.g., "https://t.me/ytx12_b"
  paidChannelUrl?: string; // e.g., "https://t.me/ytx12_b"
  price1Day?: number; // ₹29
  price3Days?: number; // ₹59
  price7Days?: number; // ₹99
  price30Days?: number; // ₹299
  baseUrl?: string;
  ownerUsername?: string; // e.g., "ONECORE_OWNER"
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  url: string; // URL or FileID
  tier?: "free" | "premium"; // 'free' comes from ytx12_b, 'premium' from paid group
  createdAt?: number; // UNIX timestamp
}

export interface UserSession {
  userId: string | number;
  username: string;
  isVerified: boolean;
  videoLimitUsed: number;
  resetAt: string; // ISO String
  isPremium: boolean;
  premiumExpiresAt?: string; // Expiration date or 'Lifetime'
  lastAdTime?: string; // ISO String
  currentVideoIndex?: number; // Currently viewed video index for pagination
  pendingUploadUrl?: string; // Temporary link being uploaded
  pendingUploadTitle?: string; // Temporary title being uploaded
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface PaymentRequest {
  id: string;
  userId: string | number;
  username: string;
  planName: string;
  cost: number;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
  fileId?: string; // Telegram Photo File ID (for real bot screenshots)
  screenshotUrl?: string; // Mock payment receipt url or simulated image attachment
}

