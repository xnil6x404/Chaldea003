const axios = require("axios");
const fs = require("fs");
const path = require("path");

const meta = {
  name: "downloader",
  keyword: [
    "https://vt.tiktok.com",
    "https://www.tiktok.com/",
    "https://www.facebook.com",
    "https://www.instagram.com/",
    "https://youtu.be/",
    "https://youtube.com/",
    "https://x.com/",
    "https://twitter.com/",
    "https://vm.tiktok.com",
    "https://fb.watch",
  ], // URLs to detect
  aliases: [],
  version: "1.0.1",
  author: "Dipto",
  description: "Auto downloads videos from social media platforms.",
  guide: ["[video_link]"],
  cooldown: 0,
  type: "anyone",
  category: "media",
};

// Triggered when the command is invoked directly (e.g., /autodl).
async function onStart({ bot, msg, chatId }) {
  await bot.sendMessage(
    chatId,
    "Send a video link, and I'll download it for you!",
    { parse_mode: "HTML" }
  );
};

// Triggered when a message contains a supported URL.
async function onWord({ bot, msg, chatId, args }) {
  const messageText = msg.link_preview_options?.url || msg.text || "";

  // Check if the message contains a supported URL
  const detectedUrl = this.meta.keyword.find((url) =>
    messageText.startsWith(url)
  );

  if (!detectedUrl) return;

  try {
    const messageId = msg.message_id;

    // Send "processing" message
    const wait = await bot.sendMessage(chatId, "⏳ Processing your request...", {
      reply_to_message_id: messageId,
    });

    const waitMId = wait.message_id;
    const videoPath = path.join(__dirname, "..", "..", "temp", "downloaded_video.mp4");

    // Fetch video download link using the fixed API endpoint
    const { data } = await axios.get(
      `${global.api.dipto}/dipto/alldl?url=${encodeURIComponent(messageText)}`
    );

    // Download the video as an arraybuffer
    const videoBuffer = (
      await axios.get(data.result, { responseType: "arraybuffer" })
    ).data;

    fs.writeFileSync(videoPath, Buffer.from(videoBuffer, "utf-8"));

    // Delete "processing" message
    await bot.deleteMessage(chatId, waitMId);

    // Send downloaded video
    await bot.sendVideo(
      chatId,
      videoPath,
      {
        caption: `${data.cp || ""} ✅`,
        reply_to_message_id: messageId,
      },
      {
        filename: "video.mp4",
        contentType: "video/mp4",
      }
    );

    fs.unlinkSync(videoPath);
  } catch (error) {
    await bot.sendMessage(chatId, `❎ Error: ${error.message}`);
  }
};

module.exports = {
  meta,
  onStart,
  onWord,
}