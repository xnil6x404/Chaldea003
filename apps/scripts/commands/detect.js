const meta = {
  name: "detect",
  keyword: ["lance", "wataru", "pastebin.com"], // These keywords trigger the onWord handler
  aliases: [],
  version: "0.0.1",
  author: "Lance Cochangco",
  description: "Detects when an admin's name is mentioned and privately notifies them with complete details.",
  guide: [""],
  cooldown: 0,
  type: "anyone",
  category: "hidden"
};

// onStart is called when the command is invoked directly (e.g., via /detect).
async function onStart({ bot, msg, message }) {
  await message.reply("Hello! You've activated the detect command directly.");
};

// onWord is called when one of the keywords is detected in any message.
async function onWord({ bot, msg, message, args }) {
  // Detect all keywords that match (case-insensitive, whole-word match)
  const detectedKeywords = meta.keyword.filter(keyword =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(msg.text)
  );

  if (detectedKeywords.length === 0) return;

  // Retrieve the admin IDs from the global configuration.
  const adminIds = global.settings.admin;
  if (!adminIds || !Array.isArray(adminIds) || adminIds.length === 0) return;

  // Gather sender (user) details.
  let senderName = msg.from.first_name || '';
  if (msg.from.last_name) senderName += ` ${msg.from.last_name}`;
  const senderUsername = msg.from.username ? ` (@${msg.from.username})` : '';
  const senderId = msg.from.id;

  // Gather chat details.
  const chatTitle = msg.chat.title ? msg.chat.title : "Private Chat";
  const chatId = msg.chat.id;

  // Construct a detailed admin alert message.
  const details = `
<b>Admin Alert</b>
A message mentioning <b>${detectedKeywords.join(', ')}</b> was sent.

<b>Chat Details:</b>
• Chat ID: <code>${chatId}</code>
• Chat Title: <b>${chatTitle}</b>

<b>User Details:</b>
• Name: <b>${senderName}</b>${senderUsername}
• User ID: <code>${senderId}</code>

<b>Message Details:</b>
• Message ID: <code>${msg.message_id}</code>
• Message Text: <i>${msg.text}</i>
  `;

  // Send a private message to each admin.
  for (const adminId of adminIds) {
    try {
      await bot.sendMessage(adminId, details, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}: ${error.message}`);
    }
  }
};

module.exports = { meta, onStart, onWord };