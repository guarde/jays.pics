import { PrismaClient, Progress } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.site.create({
    data: {
      id: "",
    },
  });
  const system = await prisma.user.create({
    data: {
      username: "System",
      password: "",
      badges: JSON.stringify([{ name: "sys", text: "SYSTEM" }]),
      is_admin: true,
      referrer_profile: {
        create: {},
      },
    },
  });
  await prisma.announcement.create({
    data: {
      content: "Welcome to jays.pics :)",
    },
  });
  await prisma.uRL.createMany({
    data: [
      {
        donator_id: system.id,
        url: "jays.pics",
        public: true,
        progress: Progress.DONE,
        zone_id: "5f5f3dc3d3fbafdfb3ee296d6ff22f03",
      },
      {
        donator_id: system.id,
        url: "femboys.wiki",
        public: true,
        progress: Progress.DONE,
        zone_id: "08b2125addb04fa4f33b8f917052fa33",
      },
      {
        donator_id: system.id,
        url: "i-dont.top",
        public: true,
        progress: Progress.DONE,
        zone_id: "81bfbcf313bb642bcc8cfd0eeae5c917",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
