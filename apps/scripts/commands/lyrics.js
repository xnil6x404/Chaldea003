const axios = require('axios');

const meta = {
  name: "lyrics",
  aliases: ["songlyrics"],
  prefix: "both",
  version: "1.0.0",
  author: "Hazeyy API",
  description: "Get song lyrics",
  guide: ["<song name>"],
  cooldown: 5,
  type: "anyone",
  category: "music"
};

async function onStart({ bot, chatId, msg, args, usages, message }) {
  // If no song name provided, send usage
  if (args.length === 0) {
    return await usages();
  }

  const song = args.join(" ");
  const apiUrl = `${global.api.hazeyy}/api/lyrics?song=${encodeURIComponent(song)}`;

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.reply) {
      const { title, artist, lyrics, image } = data.reply;

      // 1) send the cover/artwork
      await message.photo(image);

      // 2) send the lyrics with markdown formatting
      const lyricsText = `**${title} by ${artist}**\n\n${lyrics}`;
      await message.reply(lyricsText, { parse_mode: "Markdown" });

    } else {
      await message.reply("Song not found or an error occurred.");
    }
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    await message.reply("An error occurred while fetching the lyrics.");
  }
}

module.exports = { meta, onStart };
