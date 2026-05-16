export const EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "🎉",
  "🔥",
  "👏",
  "💯",
  "🙏",
  "👀",
];

import { Dimensions } from "react-native";

export const MAX_MESSAGE_LENGTH = 300;
export const MESSAGES_PER_GROUP = 20;
export const RECALL_TIME_LIMIT_MINUTES = 30;

/** Chiều rộng tối đa bubble (px) — tránh % khi parent chưa có width (RN wrap sớm). */
export const MESSAGE_BUBBLE_MAX_WIDTH = Math.floor(
  Dimensions.get("window").width * 0.78 - 48,
);
