import mongoose from "mongoose";

// Pre-register all models to avoid MissingSchemaError when populating relations across chunks
import "@/models/User";
import "@/models/Shop";
import "@/models/Category";
import "@/models/FinanceRecord";
import "@/models/AuditLog";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/newgen_fms";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/newgen_fms";

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached!.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
