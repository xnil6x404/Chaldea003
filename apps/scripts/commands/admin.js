const fs = require('fs');
const path = require('path');

// Command configuration
const meta = {
  name: "admin",
  aliases: ["admins", "ad"],
  version: "0.0.1",
  type: "anyone",
  category: "system",
  description: "Admin management command",
  cooldown: 0,
  guide: "[add/list/remove]",
  author: "ShawnDesu"
};

// Command initialization
async function onStart({ bot, message, msg, args, usages }) {
  // Define the path to the settings.json file in the json folder
  const settingsPath = path.join(process.cwd(), 'setup', 'settings.json');

  // Read the settings file
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    console.error("Error reading settings file:", error);
    return message.reply("An error occurred while accessing the admin list.");
  }

  let admins = settings.admin || [];
  const command = args[0];
  let targetId = args[1] || (msg.reply_to_message ? msg.reply_to_message.from.id : null);

  // Extract user ID from mentions if present
  if (msg.reply_to_message && !targetId) {
    targetId = msg.reply_to_message.from.id;
  } else if (args.length > 1) {
    targetId = args[1];
  }

  // Function to get user info by ID
  async function getUserInfo(userId) {
    try {
      return await bot.getChat(userId);
    } catch (err) {
      console.error("Error fetching user info:", err);
      return null;
    }
  }

  // Handle the 'list' command
  if (command === "list") {
    if (admins.length === 0) {
      return message.reply("There are currently no admins.");
    }
    let listMsg = "List of System Admins:\n\n";
    for (let adminId of admins) {
      try {
        const userInfo = await getUserInfo(adminId);
        if (userInfo) {
          const name = userInfo.first_name + ' ' + (userInfo.last_name || '');
          listMsg += `${settings.symbols || ''} ${name}\n` +
                     `https://t.me/${userInfo.username || adminId}\n\n`;
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    }
    return message.reply(listMsg);
  }

  // Handle the 'add' command
  if (["add", "-a", "a"].includes(command)) {
    if (!admins.includes(msg.from.id.toString())) {
      return message.reply("You don't have permission to use this command. Only admins can use this method.");
    }
    const id = parseInt(targetId);
    if (isNaN(id)) {
      return message.reply("⚠️ The ID provided is invalid.");
    }
    if (admins.includes(id.toString())) {
      return message.reply("This user is already an admin.");
    }
    admins.push(id.toString());
    settings.admin = admins;

    // Save the updated settings
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      console.error("Error writing settings file:", error);
      return message.reply("Failed to update admin list.");
    }

    const userInfo = await getUserInfo(id);
    const userName = userInfo ? `${userInfo.first_name} ${userInfo.last_name || ''}` : 'User';
    return message.reply(`${userName} has been successfully added as an admin.`);
  }

  // Handle the 'remove' command
  if (["remove", "-r", "r"].includes(command)) {
    if (!admins.includes(msg.from.id.toString())) {
      return message.reply("You don't have permission to use this command. Only admins can use this method.");
    }
    if (admins.length === 0) {
      return message.reply("There are no admins to remove.");
    }
    const id = parseInt(targetId);
    if (isNaN(id)) {
      return message.reply("⚠️ The ID provided is invalid.");
    }
    if (!admins.includes(id.toString())) {
      return message.reply("This user is not an admin.");
    }
    settings.admin = admins.filter(a => a !== id.toString());

    // Save the updated settings
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      console.error("Error writing settings file:", error);
      return message.reply("Failed to update admin list.");
    }

    const userInfo = await getUserInfo(id);
    const userName = userInfo ? `${userInfo.first_name} ${userInfo.last_name || ''}` : 'User';
    return message.reply(`${userName} has been successfully removed as an admin.`);
  }

  // Handle invalid or unknown commands
  return usages();
}

module.exports = { meta, onStart };
