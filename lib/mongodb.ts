import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (false) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI aniqlanmadi. .env.local parametrlarini tekshiring.");
    }

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;
