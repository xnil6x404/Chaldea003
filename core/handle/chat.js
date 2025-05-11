exports.chat = async function({ bot, message, msg, chatId, args }) {
  const { commands } = global.chaldea;

  // Iterate over all registered commands that implement an onChat handler.
  for (const [commandName, command] of commands.entries()) {
    if (command.onChat) {
      try {
        // If a command’s onChat returns false, stop further processing.
        const shouldContinue = await command.onChat({
          bot,
          message,
          msg,
          chatId,
          args
        });
        if (shouldContinue === false) {
          break;
        }
      } catch (error) {
        console.error(`Error executing onChat for command "${commandName}":`, error);
      }
    }
  }
};