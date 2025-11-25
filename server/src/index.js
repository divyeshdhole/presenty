import dotenv from 'dotenv';
import cron from 'node-cron';
import fetch from 'node-fetch';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      scheduleHeartbeat();
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

const scheduleHeartbeat = () => {
  const url = process.env.HEARTBEAT_URL || `http://localhost:${PORT}/health`;
  cron.schedule('*/5 * * * *', async () => {
    try {
      await fetch(url);
      console.log(`Heartbeat pinged ${url}`);
    } catch (error) {
      console.warn('Heartbeat failed', error.message);
    }
  });
};
