/**
 * After migrations, create your first accounts via the UI:
 * - /auth/register (patient, default role from Prisma)
 *
 * Promote roles and attach biometrics with Prisma Studio or SQL when needed.
 * Example (run in SQL after you have a user id):
 *   UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
 *   INSERT INTO biometric_auth (id, "userId", "faceVerified", "irisVerified", "fingerprintVerified", "verifiedAt")
 *   VALUES (gen_random_uuid()::text, '<user-id>', true, true, true, NOW());
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log(`Users in database: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
