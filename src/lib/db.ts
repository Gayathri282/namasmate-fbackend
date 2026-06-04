import mongoose from "mongoose";

export async function dbConnect() {
  // Read URI inside the function so dotenv has already loaded it by the time this runs
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("[MongoDB] MONGODB_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    if (mongoose.connection.readyState >= 1) {
      console.log("[MongoDB] Already connected, reusing existing connection.");
      return;
    }
    await mongoose.connect(MONGODB_URI);
    console.log("[MongoDB] ✅ Connected successfully to:", MONGODB_URI.split("@")[1] ?? MONGODB_URI);
  } catch (error) {
    console.error("[MongoDB] ❌ Connection error:", error);
    process.exit(1);
  }
}
