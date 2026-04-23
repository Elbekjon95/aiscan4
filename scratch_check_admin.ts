import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const admins = await prisma.user.findMany({ where: { role: 'super_admin' } });
    console.log('SUPER_ADMIN_LIST:', admins);
}
main().catch(console.error).finally(() => prisma.$disconnect());
