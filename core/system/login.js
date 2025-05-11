const TelegramBot = require('node-telegram-bot-api');

/**
 * Initializes Telegram bots based on tokens defined in setup/states.json
 * @returns {TelegramBot[]} Array of initialized TelegramBot instances
 */
const login = () => {
  // Load tokens from global.states (set in main.js)
  const tokens = global.states.tokens;

  // Create bot instances for each token
  const bots = tokens.map(token => new TelegramBot(token, { polling: true }));
  const { listen } = require('../listen.js');

  // Attach handlers to each bot
  bots.forEach(bot => listen(bot));

  return bots;
};

module.exports = { login };