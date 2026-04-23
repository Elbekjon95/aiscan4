import { Pool } from 'pg';
import mongoose from 'mongoose';

async function check() {
  console.log("---- PG ----");
  const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.127.126.49:5432/aiscan_db?schema=public' });
  try {
    const res = await pool.query("SELECT username, role, airport FROM \"User\" WHERE role IN ('super_admin', 'admin')");
    console.log("PG Admins:", res.rows);
  } catch (e) {
    console.error("PG error:", e.message);
  } finally {
    await pool.end();
  }

  console.log("---- MONGO ----");
  try {
    await mongoose.connect('mongodb://localhost:27017/aiscan3_db');
    const users = await mongoose.connection.db.collection('users').find({ role: { $in: ['super_admin', 'admin'] } }).toArray();
    console.log("MONGO Admins:", users.map(u => ({ username: u.username, role: u.role, airport: u.airport })));
  } catch (e) {
    console.error("Mongo error:", e.message);
  } finally {
    await mongoose.disconnect();
  }
}
check();
