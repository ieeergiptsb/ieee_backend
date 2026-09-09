/**
 * Helper script to promote a user to admin role.
 * Usage: node scripts/promoteToAdmin.mjs [email]
 * Default: jainarjav80@gmail.com
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { default: connectDB } = await import('../src/config/database.js');
const { default: User } = await import('../src/models/User.js');

const targetEmail = (process.argv[2] || 'jainarjav80@gmail.com').toLowerCase().trim();

await connectDB();

const user = await User.findOne({ email: targetEmail });
if (!user) {
  console.log(`User with email "${targetEmail}" was not found in the database.`);
  console.log(`Please sign up first at http://localhost:3000/signup, then re-run this script.`);
  const allUsers = await User.find().select('email role full_name').lean();
  console.log('Current users in DB:', allUsers.length ? allUsers : 'None');
} else {
  user.role = 'admin';
  await user.save();
  console.log(`✅ Success: User "${user.full_name}" (${user.email}) is now an ADMIN!`);
}

process.exit(0);
