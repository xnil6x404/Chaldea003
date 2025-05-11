const fs = require('fs');
const path = require('path');
const { Message } = require("./system/message");

exports.listen = async function (bot) {
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const message = new Message(bot, msg);
      const handlersPath = path.join(__dirname, 'handle');

      const files = fs.readdirSync(handlersPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const fullPath = path.join(handlersPath, file);

          // Clear cache to allow hot reload in development
          delete require.cache[require.resolve(fullPath)];

          const handlerModule = require(fullPath);
          const handlerName = path.basename(file, '.js');
          const handler = handlerModule[handlerName];

          if (typeof handler === 'function') {
            await handler({ bot, msg, chatId, userId, message });
          } else {
            console.warn(`Handler ${file} does not export a function named "${handlerName}".`);
          }
        }
      }
    } catch (error) {
      console.error('Error in message handler:', error);
    }
  });
};
