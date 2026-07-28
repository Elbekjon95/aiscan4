const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = "postgresql://postgres:root@localhost:5432/aiscan_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const deleted = await prisma.request.deleteMany({});
        console.log(`Successfully deleted ${deleted.count} request records from the database cache!`);
    } catch (e) {
        console.error('Error clearing requests:', e);
    } finally {
        await prisma.$disconnect();
        pool.end();
    }
}

main();
