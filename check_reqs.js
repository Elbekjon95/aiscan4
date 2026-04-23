const { Pool } = require('pg');

async function check() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.127.126.49:5432/aiscan_db?schema=public' });
  try {
    const res = await pool.query('SELECT full_analysis FROM "Request" ORDER BY created_at DESC LIMIT 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const data = row.full_analysis;
      console.log(Array.isArray(data) ? "It's an array!" : "It's an object.");
      if (Array.isArray(data)) {
        console.log("Keys of first element:", Object.keys(data[0]));
        console.log("total_score in first element:", data[0].total_score);
      } else {
        console.log("Keys:", Object.keys(data));
      }
    }
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}

check();
