import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Simple Cloudinary connection test – using CommonJS require to avoid missing typings
const cloudinary = require('cloudinary').v2;

console.log("Attempting Cloudinary connection...");
console.log("cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("api_secret:", process.env.CLOUDINARY_API_SECRET ? "PRESENT" : "MISSING");

async function testConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Cloudinary connection failed:', err);
    process.exit(1);
  }
}

testConnection();
