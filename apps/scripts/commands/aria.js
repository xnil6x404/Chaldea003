const axios = require('axios');

const meta = {
  name: "aria",
  version: "0.0.2",
  aliases: [],
  description: "Ask Aria AI anything",
  author: "Hazeyy API",
  prefix: "both",
  category: "ai",
  type: "anyone",
  cooldown: 5,
  guide: "[your question]"
};

async function onStart({ bot, args, message, msg, usages }) {
  try {
    const question = args.join(" ");

    if (!question) {
      return usages();
    }

    const response = await axios.get(`${global.api.hazeyy}/api/aria?q=${encodeURIComponent(question)}`);

    if (response.data && response.data.aria) {
      return message.reply(`${response.data.aria}`);
    } else {
      return message.reply("Aria AI couldn't generate a response. Please try again later.");
    }
  } catch (error) {
    console.error(`[ ${meta.name} ] » ${error}`);
    return message.reply(`[ ${meta.name} ] » An error occurred while connecting to Aria AI.`);
  }
}

module.exports = { meta, onStart };