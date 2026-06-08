const mongoose = require("mongoose");

let isMongoDBConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn("\x1b[33m%s\x1b[0m", "[Database] MONGODB_URI is not defined in .env. Falling back to local JSON database.");
    isMongoDBConnected = false;
    return false;
  }

  try {
    // Set connection timeout options for quick failure detection during local startup
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000, 
    });
    isMongoDBConnected = true;
    console.log("\x1b[32m%s\x1b[0m", "[Database] Connected to MongoDB Atlas successfully.");
    return true;
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", `[Database] MongoDB Connection Error: ${error.message}`);
    console.warn("\x1b[33m%s\x1b[0m", "[Database] Falling back to local JSON database.");
    isMongoDBConnected = false;
    return false;
  }
};

const isConnected = () => {
  return isMongoDBConnected && mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  isConnected
};
