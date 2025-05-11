// core/utility/dbUtils.js
/**
 * Creates a new user in the database.
 * @param {string} userId - The user's Telegram ID.
 * @param {string} username - The user's username.
 */
async function createUser(userId, username) {
  try {
    const usersCollection = global.db.collection('users');
    const result = await usersCollection.insertOne({
      userId: userId,
      username: username,
      balance: 0 // Initial balance
    });
    console.log(`User created with ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

module.exports = { createUser };