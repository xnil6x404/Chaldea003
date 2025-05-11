// core/system/db.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mdshawonmiah2011:mdshawonmiah2011143@tgbot.fp7yu0x.mongodb.net/?retryWrites=true&w=majority&appName=Tgbot'; // Replace with your MongoDB connection string
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db('tgbot'); // Replace with your database name
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = { connectDB };