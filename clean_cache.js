const { Pool } = require('pg');
async function clean() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.127.126.49:5432/aiscan_db?schema=public' });
  try {
    await pool.query('DELETE FROM "Request" WHERE analysis_score = 0 AND compliance_score = 0');
    console.log("Deleted cached bad requests");
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
clean();
