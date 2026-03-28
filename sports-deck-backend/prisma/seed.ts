import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) throw new Error("environment failed");

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: "ADMIN" },
    create: {
      email,
      password: hashedPassword,
      username: process.env.ADMIN_USERNAME || "admin",
      role: "ADMIN",
    },
  });


  const testPassword = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.upsert({
    where: { email: "iamauser@example.com" },
    update: {},
    create: {
      email: "iamauser@example.com",
      username: "iamsuser",
      password: testPassword,
      favoriteTeam: "Arsenal",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "iamanoth@example.com" },
    update: {},
    create: {
      email: "iamanoth@example.com",
      username: "iamanotheruser",
      password: testPassword,
      favoriteTeam: "Chelsea",
    },
  });


  const tagMatchday = await prisma.tag.upsert({ where: { name: "Matchday" }, update: {}, create: { name: "Matchday" } });
  const tagTransfers = await prisma.tag.upsert({ where: { name: "Transfers" }, update: {}, create: { name: "Transfers" } });

  let targetMatch = await prisma.match.findFirst({
    where: { status: "FINISHED" },
    orderBy: { matchDate: 'desc' } 
  });

  if (!targetMatch) {
    targetMatch = await prisma.match.findFirst(); 
  }

  const threadCount = await prisma.thread.count();

  if (threadCount === 0) {
    
    if (targetMatch) {
      
      await prisma.thread.create({
        data: {
          title: `What a game! Thoughts on ${targetMatch.homeTeam} vs ${targetMatch.awayTeam}?`,
          authorId: user1.id,
          matchId: targetMatch.id,
          tags: { create: [{ tagId: tagMatchday.id }] },
          posts: {
            create: [
              {
                content: "Absolutely massive performance today. The midfield was dominant!",
                authorId: user1.id,
                replies: {
                  create: [
                    { content: "Agreed! Best performance of the season so far.", authorId: admin.id },
                  ],
                },
              },
            ],
          },
        },
      });
    } else {
      console.warn("⚠️ No matches found in the database. Skipping match-related thread creation.");
    }

    await prisma.thread.create({
      data: {
        title: "Summer Transfer Window Predictions",
        authorId: admin.id,
        tags: { create: [{ tagId: tagTransfers.id }] },
        posts: {
          create: [{ content: "Who do you guys think will be the biggest signing this summer?", authorId: admin.id }],
        },
      },
    });

  }

}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });