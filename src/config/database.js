import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Pool size tuned for single-worker deployment on memory-constrained hosts.
    // Each idle connection holds ~1 MB of socket buffer; 10 is plenty for typical load.
    // Increase WEB_CONCURRENCY + maxPoolSize together if you add cluster workers.
    const pool = parseInt(process.env.MONGODB_POOL_SIZE || '10', 10);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: pool,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

