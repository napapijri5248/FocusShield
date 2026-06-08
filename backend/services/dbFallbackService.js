const fs = require("fs");
const path = require("path");

const DB_FILE_PATH = path.join(__dirname, "..", "data", "db.json");

// Ensure the data directory and db.json file exist
const initDbFile = () => {
  const dirPath = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialStructure = {
      users: [],
      sessions: []
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialStructure, null, 2), "utf8");
    console.log("[Fallback DB] Initialized db.json database file.");
  }
};

// Helper: read whole DB
const readDB = () => {
  initDbFile();
  try {
    const rawData = fs.readFileSync(DB_FILE_PATH, "utf8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("[Fallback DB] Error reading file, resetting DB:", error.message);
    const initialStructure = { users: [], sessions: [] };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialStructure, null, 2), "utf8");
    return initialStructure;
  }
};

// Helper: write whole DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("[Fallback DB] Error writing to file:", error.message);
  }
};

const dbFallbackService = {
  // Find multiple records matching filter
  find: (collection, filterFunc = () => true) => {
    const db = readDB();
    const items = db[collection] || [];
    return items.filter(filterFunc);
  },

  // Find one record matching filter
  findOne: (collection, filterFunc) => {
    const db = readDB();
    const items = db[collection] || [];
    return items.find(filterFunc) || null;
  },

  // Insert a new record
  insert: (collection, doc) => {
    const db = readDB();
    if (!db[collection]) {
      db[collection] = [];
    }

    const newDoc = {
      _id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db[collection].push(newDoc);
    writeDB(db);
    return newDoc;
  },

  // Update a single record matching filter
  updateOne: (collection, filterFunc, updates) => {
    const db = readDB();
    const items = db[collection] || [];
    const index = items.findIndex(filterFunc);

    if (index === -1) return null;

    const updatedDoc = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    items[index] = updatedDoc;
    writeDB(db);
    return updatedDoc;
  },

  // Delete a record
  deleteOne: (collection, filterFunc) => {
    const db = readDB();
    const items = db[collection] || [];
    const index = items.findIndex(filterFunc);

    if (index === -1) return false;

    db[collection].splice(index, 1);
    writeDB(db);
    return true;
  }
};

module.exports = dbFallbackService;
