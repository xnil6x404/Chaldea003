const moment = require("moment-timezone");

exports.command = async function ({ bot, message, msg, chatId, args }) {
  if (typeof msg.text !== "string") return;

  const text = msg.text;
  const dateNow = Date.now();
  const time = moment.tz(global.settings.timeZone).format("HH:mm:ss DD/MM/YYYY");

  const { admin, symbols, devMode, prefix } = global.settings;
  const { commands, cooldowns } = global.chaldea;
  const { from, chat } = msg;
  const senderID = String(from.id);
  const userId = from.id;

  let effectivePrefix = prefix;

  const prefixUsed = text.startsWith(effectivePrefix);
  const commandText = prefixUsed ? text.slice(effectivePrefix.length).trim() : text.trim();

  if (commandText.length === 0) {
    if (prefixUsed) {
      return message.reply("Please enter a command after the prefix.");
    } else {
      return;
    }
  }

  const commandArgs = commandText.split(/\s+/);
  let commandName = commandArgs.shift().toLowerCase();

  if (commandName.includes("@")) {
    const parts = commandName.split("@");
    commandName = parts[0];
    try {
      const me = await bot.getMe();
      const botUsername = me.username;
      if (parts[1].toLowerCase() !== botUsername.toLowerCase()) {
        return;
      }
    } catch (error) {
      console.error("Failed to get bot username:", error);
      return;
    }
  }

  let command = commands.get(commandName);

  if (!command) {
    for (const cmd of commands.values()) {
      if (
        cmd.meta.aliases &&
        Array.isArray(cmd.meta.aliases) &&
        cmd.meta.aliases.map((alias) => alias.toLowerCase()).includes(commandName)
      ) {
        command = cmd;
        break;
      }
    }
  }

  if (!command) {
    if (prefixUsed) {
      return message.reply(`The command "${commandName}" is not found in my system.`);
    } else {
      return;
    }
  }

  let cmdPrefixSetting = command.meta.prefix;
  if (cmdPrefixSetting === undefined) cmdPrefixSetting = true;

  if (cmdPrefixSetting === true && !prefixUsed) {
    return message.reply(
      `The command "${command.meta.name}" requires a prefix. Please use "${effectivePrefix}" before the command name.`
    );
  }
  if (cmdPrefixSetting === false && prefixUsed) {
    return message.reply(
      `The command "${command.meta.name}" does not require a prefix. Please invoke it without the prefix.`
    );
  }

  const usages = () => {
    if (!command.meta.guide) return;
    let usageText = `${symbols} Usages:\n\n`;
    const displayPrefix = command.meta.prefix === false ? "" : effectivePrefix;
    if (Array.isArray(command.meta.guide)) {
      for (const guide of command.meta.guide) {
        usageText += `${displayPrefix}${command.meta.name} ${guide}\n`;
      }
      if (command.meta.description) {
        usageText += `\n- ${command.meta.description}`;
      }
    } else {
      usageText += `${displayPrefix}${command.meta.name} ${command.meta.guide}`;
      if (command.meta.description) {
        usageText += `\n- ${command.meta.description}`;
      }
    }
    return message.reply(usageText, { parse_mode: "Markdown" });
  };

  const isBotAdmin = admin.includes(senderID);
  const isVIP = global.vip.uid.includes(senderID);

  if (command.meta.type === "administrator" && !isBotAdmin) {
    if (!["group", "supergroup"].includes(chat.type)) {
      return message.reply(
        `The "${command.meta.name}" command can only be used in a group or supergroup by an administrator.`
      );
    }
    try {
      const member = await bot.getChatMember(chatId, senderID);
      if (!(member.status === "administrator" || member.status === "creator")) {
        return message.reply(
          `You do not have sufficient permission to use the "${command.meta.name}" command. (Requires group administrator)`
        );
      }
    } catch (error) {
      return message.reply("Unable to verify your group admin status. Please try again later.");
    }
  }

  if (!isBotAdmin) {
    if (command.meta.type === "admin") {
      return message.reply(`You do not have sufficient permission to use the "${command.meta.name}" command.`);
    }
    if (command.meta.type === "vip" && !isVIP) {
      return message.reply(`You do not have VIP access to use the "${command.meta.name}" command.`);
    }
    if (command.meta.type === "group" && !["group", "supergroup"].includes(chat.type)) {
      return message.reply(`The "${command.meta.name}" command can only be used in a group or supergroup.`);
    }
    if (command.meta.type === "private" && chat.type !== "private") {
      return message.reply(`The "${command.meta.name}" command can only be used in private chats.`);
    }
  }

  if (!isBotAdmin) {
    if (!cooldowns.has(command.meta.name)) {
      cooldowns.set(command.meta.name, new Map());
    }
    const timestamps = cooldowns.get(command.meta.name);
    const expirationTime = (command.meta.cooldown || 1) * 1000;
    if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) {
      const timeLeft = Math.ceil((timestamps.get(senderID) + expirationTime - dateNow) / 1000);
      return message.reply(`😼 Please wait ${timeLeft} seconds before using "${commandName}" again.`);
    }
    timestamps.set(senderID, dateNow);
  }

  try {
    const context = {
      bot,
      message,
      msg,
      chatId,
      args: commandArgs,
      type: isBotAdmin ? "admin" : "anyone",
      userId,
      usages
    };

    await command.onStart(context);

    if (devMode === true) {
      const executionTime = Date.now() - dateNow;
      const consoleWidth = process.stdout.columns || 60;
      const separator = "─".repeat(consoleWidth);
      const logMessage = `
${separator}
[ DEV MODE ]
Command         : ${commandName}
Time            : ${time}
Sender ID       : ${senderID}
Arguments       : ${commandArgs.join(" ") || "None"}
Execution Time  : ${executionTime}ms
${separator}
      `.trim();
      console.log(logMessage);
    }
  } catch (e) {
    console.error(`Error executing command "${commandName}":`, e);
    return message.reply(`Error executing command "${commandName}": ${e.message}`);
  }
};
