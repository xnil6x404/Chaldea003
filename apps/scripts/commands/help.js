const meta = {
  name: "help",
  aliases: ["h"],
  version: "0.0.1",
  author: "ShawnDesu",
  description: "Displays help information for commands.",
  guide: "<command|page|all>",
  cooldown: 5,
  prefix: "both",
  type: "anyone",
  category: "system",
};

const COMMANDS_PER_PAGE = 10;

async function onStart({ bot, chatId, msg, message }) {
  try {
    const userId = msg.from.id;
    const { commands } = global.chaldea;
    const { admin, prefix: globalPrefix, symbols } = global.settings;
    const vipUsers = global.vip.uid.includes(userId);
    const senderID = String(userId);
    const chatType = msg.chat.type;
    const args = msg.text.split(" ").slice(1);
    const cleanArg = args[0] ? args[0].trim().toLowerCase() : "";

    // If an argument matches a command, show its detailed info.
    if (cleanArg) {
      const command =
        commands.get(cleanArg) ||
        [...commands.values()].find(
          (cmd) =>
            Array.isArray(cmd.meta.aliases) &&
            cmd.meta.aliases.map((alias) => alias.toLowerCase()).includes(cleanArg)
        );
      if (command) {
        const helpMessage = generateCommandInfo(command.meta, globalPrefix);
        return await message.reply(helpMessage, { parse_mode: "Markdown" });
      }
    }

    // Determine pagination or all-commands.
    const isAll = cleanArg === "all" || cleanArg === "-all" || cleanArg === "-a";
    const parsedPage = parseInt(cleanArg);
    const pageNumber = !isAll && !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    // Get effective prefix and permission flags.
    const effectivePrefix = chatType === "private" ? globalPrefix : globalPrefix;
    const isBotAdmin = admin.includes(senderID);
    const isGroupAdmin = await checkGroupAdmin(bot, chatId, senderID, chatType);

    // Generate help message and inline navigation.
    const { helpMessage, replyMarkup } = generateHelpMessage(
      commands,
      senderID,
      isBotAdmin,
      isGroupAdmin,
      pageNumber,
      cleanArg,
      effectivePrefix,
      symbols,
      vipUsers,
      chatType
    );

    // Send help message.
    const sentMsg = await message.reply(helpMessage, {
      parse_mode: "Markdown",
      reply_markup:
        replyMarkup && replyMarkup.inline_keyboard && replyMarkup.inline_keyboard.length
          ? replyMarkup
          : undefined,
    });

    // Create a unique session ID and store details.
    const instanceId = "help_" + Date.now().toString();
    global.chaldea.callbacks.set(instanceId, {
      senderID,
      helpMessageId: sentMsg.message_id,
      chatId,
    });

    // Update inline buttons with instanceId.
    if (replyMarkup && replyMarkup.inline_keyboard && replyMarkup.inline_keyboard.length) {
      const newReplyMarkup = updateReplyMarkupWithInstanceId(replyMarkup, instanceId);
      await bot.editMessageReplyMarkup(newReplyMarkup, { chat_id: chatId, message_id: sentMsg.message_id });
    }
  } catch (error) {
    console.error("Error in help command onStart:", error);
  }
}

async function onCallback({ bot, callbackQuery }) {
  try {
    // Verify that the callback payload is for the help command.
    if (!callbackQuery || !callbackQuery.data) return;
    let payload;
    try {
      payload = JSON.parse(callbackQuery.data);
    } catch (e) {
      return; // Invalid payload
    }
    if (payload.command !== "help" || !payload.instanceId) return;

    const session = global.chaldea.callbacks.get(payload.instanceId);
    if (!session) return;
    if (String(callbackQuery.from.id) !== session.senderID) return;

    const newPageNumber = payload.page;
    const { commands } = global.chaldea;
    const { admin, prefix: globalPrefix, symbols } = global.settings;
    const senderID = String(callbackQuery.from.id);
    const vipUsers = global.vip.uid.includes(senderID);
    const chat_id = callbackQuery.message.chat.id;
    const chatType = callbackQuery.message.chat.type;

    const effectivePrefix = chatType === "private" ? globalPrefix : globalPrefix;
    const isBotAdmin = admin.includes(senderID);
    const isGroupAdmin = await checkGroupAdmin(bot, chat_id, senderID, chatType);

    const { helpMessage, replyMarkup } = generateHelpMessage(
      commands,
      senderID,
      isBotAdmin,
      isGroupAdmin,
      newPageNumber,
      null, // cleanArg not needed for callbacks
      effectivePrefix,
      symbols,
      vipUsers,
      chatType
    );
    const newReplyMarkup =
      replyMarkup && replyMarkup.inline_keyboard && replyMarkup.inline_keyboard.length
        ? updateReplyMarkupWithInstanceId(replyMarkup, payload.instanceId)
        : undefined;

    await bot.editMessageText(helpMessage, {
      chat_id,
      message_id: callbackQuery.message.message_id,
      parse_mode: "Markdown",
      reply_markup: newReplyMarkup,
    });

    // Update session details.
    session.helpMessageId = callbackQuery.message.message_id;
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in help command onCallback:", error);
  }
}

/* Helper Functions */

/**
 * Updates inline keyboard buttons so that each callback_data JSON includes the current instanceId.
 */
function updateReplyMarkupWithInstanceId(replyMarkup, instanceId) {
  if (!replyMarkup || !replyMarkup.inline_keyboard) return replyMarkup;
  const updatedKeyboard = replyMarkup.inline_keyboard.map((row) =>
    row.map((button) => {
      if (button && button.callback_data) {
        try {
          const data = JSON.parse(button.callback_data);
          data.instanceId = instanceId;
          return { text: button.text, callback_data: JSON.stringify(data) };
        } catch (e) {
          return button;
        }
      }
      return button;
    })
  );
  return { inline_keyboard: updatedKeyboard };
}

/**
 * Determines whether the sender is an administrator (or creator) in a group chat.
 */
async function checkGroupAdmin(bot, chatId, senderID, chatType) {
  if (["group", "supergroup"].includes(chatType)) {
    try {
      const member = await bot.getChatMember(chatId, senderID);
      return member.status === "administrator" || member.status === "creator";
    } catch (err) {
      return false;
    }
  }
  return false;
}

/**
 * Generates the help message text and inline keyboard.
 * If "all" is requested, returns a grouped list with no buttons.
 */
function generateHelpMessage(
  commands,
  senderID,
  isBotAdmin,
  isGroupAdmin,
  pageNumber,
  cleanArg,
  prefix,
  symbols,
  vipUsers,
  chatType
) {
  const filteredCommands = getFilteredCommands(commands, senderID, isBotAdmin, isGroupAdmin, vipUsers, chatType);
  const totalCommands = filteredCommands.length;
  const totalPages = Math.ceil(totalCommands / COMMANDS_PER_PAGE) || 1;

  if (cleanArg === "all" || cleanArg === "-all" || cleanArg === "-a") {
    return {
      helpMessage: generateAllCommandsMessage(filteredCommands, prefix, symbols),
      replyMarkup: {},
    };
  }

  const validPage = Math.min(pageNumber, totalPages);
  const start = (validPage - 1) * COMMANDS_PER_PAGE;
  const paginatedCommands = filteredCommands
    .slice(start, start + COMMANDS_PER_PAGE)
    .map((cmd) => `${symbols} ${prefix}${cmd.meta.name}`);

  const helpMessage =
    `📜 *Command List*\n\n${paginatedCommands.join("\n")}\n\n` +
    `*Page:* ${validPage}/${totalPages}\n*Total Commands:* ${totalCommands}`;

  // Build inline navigation buttons.
  const inlineButtons = [];
  if (validPage > 1) {
    inlineButtons.push({
      text: "◀️",
      callback_data: JSON.stringify({ command: "help", instanceId: null, page: validPage - 1 }),
    });
  }
  if (validPage < totalPages) {
    inlineButtons.push({
      text: "▶️",
      callback_data: JSON.stringify({ command: "help", instanceId: null, page: validPage + 1 }),
    });
  }
  const replyMarkup = inlineButtons.length ? { inline_keyboard: [inlineButtons] } : {};

  return { helpMessage, replyMarkup };
}

/**
 * Filters available commands based on the sender's permissions and command type.
 */
function getFilteredCommands(commands, senderID, isBotAdmin, isGroupAdmin, vipUsers, chatType) {
  return [...commands.values()]
    .filter((cmd) => {
      if (cmd.meta.category && cmd.meta.category.toLowerCase() === "hidden") return false;
      if (!isBotAdmin) {
        if (cmd.meta.type === "admin") return false;
        if (cmd.meta.type === "vip" && !vipUsers) return false;
        if (cmd.meta.type === "administrator" && !isGroupAdmin) return false;
        if (cmd.meta.type === "group" && !["group", "supergroup"].includes(chatType)) return false;
        if (cmd.meta.type === "private" && chatType !== "private") return false;
      }
      return true;
    })
    .sort((a, b) => a.meta.name.localeCompare(b.meta.name));
}

/**
 * Generates a grouped list of all commands.
 */
function generateAllCommandsMessage(filteredCommands, prefix, symbols) {
  const categories = {};
  filteredCommands.forEach((cmd) => {
    const cat = capitalize(cmd.meta.category || "misc");
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(`${prefix}${cmd.meta.name}`);
  });

  const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b));
  sortedCategories.forEach((cat) => categories[cat].sort((a, b) => a.localeCompare(b)));

  const blocks = sortedCategories.map((cat) => {
    const commandsList = categories[cat].map((command) => `│➥ ${command}`).join("\n");
    return (
      "╭─────────────────✦\n" +
      `│ ${cat}\n` +
      "├───✦ \n" +
      commandsList + "\n" +
      "╰─────────────────✦"
    );
  });

  return blocks.join("\n\n") + `\n\nTotal Commands: ${filteredCommands.length}`;
}

/**
 * Generates detailed information for a single command.
 */
function generateCommandInfo(cmdInfo, prefix) {
  const aliases =
    cmdInfo.aliases && cmdInfo.aliases.length
      ? `*Aliases:*\n${cmdInfo.aliases.map((alias) => `\`${alias}\``).join(", ")}`
      : "*Aliases:*\nNone";

  let usageList = "";
  if (cmdInfo.guide) {
    usageList =
      Array.isArray(cmdInfo.guide) && cmdInfo.guide.length
        ? cmdInfo.guide.map((u) => `\`${prefix}${cmdInfo.name} ${u}\``).join("\n")
        : `\`${prefix}${cmdInfo.name} ${cmdInfo.guide}\``;
  } else {
    usageList = "No usage instructions provided.";
  }

  return (
    `📘 *Command:* \`${cmdInfo.name}\`\n\n` +
    `*Description:*\n${cmdInfo.description}\n\n` +
    `*Usage:*\n${usageList}\n\n` +
    `*Category:*\n${capitalize(cmdInfo.category || "misc")}\n\n` +
    `*Cooldown:*\n${cmdInfo.cooldown || 0} seconds\n\n` +
    aliases
  );
}

/**
 * Capitalizes the first letter of a given text.
 */
function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = { meta, onStart, onCallback };