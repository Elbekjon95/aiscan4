import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.127.126.49:5432/aiscan_db?schema=public' });
  await pool.query('UPDATE "User" SET password = $1 WHERE username = $2', [hash, 'tasffxh']);
  console.log("Password updated to 123456 via PG!");
  await pool.end();
}
main();
