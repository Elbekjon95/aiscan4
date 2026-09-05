import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve('./.pg_data');

// Clean up stale postmaster.pid if process is not running
const pidFile = path.join(dbDir, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
    try {
        const firstLine = fs.readFileSync(pidFile, 'utf8').trim().split('\n')[0];
        const pid = parseInt(firstLine, 10);
        let isRunning = false;
        if (pid) {
            try {
                process.kill(pid, 0);
                isRunning = true;
            } catch {
                isRunning = false;
            }
        }
        if (!isRunning) {
            console.log(`Removing stale postmaster.pid (PID: ${pid})...`);
            fs.unlinkSync(pidFile);
        }
    } catch (e) {
        console.warn("Could not check/remove stale postmaster.pid:", e);
    }
}

const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: 'postgres',
    password: 'root',
    port: 5432,
    persistent: true,
    initdbFlags: ['-E', 'UTF8', '--locale=C'],
});

async function run() {
    const isInitialized = fs.existsSync(path.join(dbDir, 'PG_VERSION'));
    if (!isInitialized) {
        console.log("Initializing PostgreSQL database...");
        await pg.initialise();
    } else {
        console.log("PostgreSQL database already initialized.");
    }
    console.log("Starting PostgreSQL on port 5432...");
    await pg.start();
    try {
        await pg.createDatabase('aiscan_db');
        console.log("Database 'aiscan_db' created.");
    } catch (e) {
        console.log("Database 'aiscan_db' status:", e.message || e);
    }
    console.log("PostgreSQL is running successfully on port 5432!");

    // Keep process alive so embedded postgres doesn't terminate
    setInterval(() => {}, 1000 * 60 * 60);
}

run().catch(err => {
    console.error("Failed to start PostgreSQL:", err);
    process.exit(1);
});
