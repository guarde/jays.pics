const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Deletes Discord-pending accounts that were created more than 12 hours ago
 * and were never activated with a referral code.
 */
module.exports = async (payload, helpers) => {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const expired = await prisma.user.findMany({
    where: {
      discord_pending: true,
      discord_pending_since: { lte: cutoff },
    },
    select: { id: true, username: true },
  });

  if (expired.length === 0) return;

  for (const user of expired) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log(
    `[cleanPendingDiscord] Deleted ${expired.length} expired pending Discord account(s)`,
  );
};
