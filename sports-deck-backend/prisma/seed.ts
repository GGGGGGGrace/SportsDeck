/*
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
  */
import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) throw new Error("Environment variables for Admin failed");

  const hashedPassword = await bcrypt.hash(password, 10);
  const testPassword = await bcrypt.hash("password123", 10);

  // ---------------------------------------------------------
  // 1. UPSERT ADMIN
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // 2. UPSERT DIVERSE USERS (15 Users total including banned)
  // ---------------------------------------------------------
  const userData = [
    { email: "user1@example.com", username: "arsenal_fan", favoriteTeam: "Arsenal" },
    { email: "user2@example.com", username: "cfc_blue", favoriteTeam: "Chelsea" },
    { email: "user3@example.com", username: "kopite99", favoriteTeam: "Liverpool" },
    { email: "user4@example.com", username: "cityzen", favoriteTeam: "Man City" },
    { email: "user5@example.com", username: "spurs_hub", favoriteTeam: "Tottenham" },
    { email: "user6@example.com", username: "utd_glory", favoriteTeam: "Man United" },
    { email: "user7@example.com", username: "villa_park", favoriteTeam: "Aston Villa" },
    { email: "user8@example.com", username: "toon_army", favoriteTeam: "Newcastle" },
    { email: "user9@example.com", username: "hammer_time", favoriteTeam: "West Ham" },
    { email: "user10@example.com", username: "seagulls", favoriteTeam: "Brighton" },
    { email: "user11@example.com", username: "tactics_nerd", favoriteTeam: "Brentford" },
    { email: "user12@example.com", username: "stat_guy", favoriteTeam: "Fulham" },
    { email: "banned1@example.com", username: "toxic_troll", favoriteTeam: "Chelsea", banned: true },
    { email: "banned2@example.com", username: "bot_spammer", favoriteTeam: null, banned: true },
  ];

  const users = await Promise.all(
    userData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { banned: u.banned || false },
        create: { ...u, password: testPassword },
      })
    )
  );

  // ---------------------------------------------------------
  // 3. UPSERT TAGS
  // ---------------------------------------------------------
  const tagNames = ["Matchday", "Transfers", "Fun", "News", "Rumor", "Tactics"];
  const tags: Record<string, any> = {};
  
  for (const name of tagNames) {
    tags[name] = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------------------------------------------------------
  // 4. FETCH EXISTING API MATCH (DO NOT CREATE)
  // ---------------------------------------------------------
  let targetMatch = await prisma.match.findFirst({
    where: { status: "FINISHED" },
    orderBy: { matchDate: 'desc' } 
  });

  if (!targetMatch) {
    targetMatch = await prisma.match.findFirst(); 
  }

  if (targetMatch) {
    console.log(`🔗 Found existing match from API: ${targetMatch.homeTeam} vs ${targetMatch.awayTeam}. Linking threads...`);
  } else {
    console.log("⚠️ No matches fetched from API yet. Creating generic unlinked threads.");
  }

  // ---------------------------------------------------------
  // 5. SEED THREADS, POSTS, REPLIES, REPORTS & POLLS
  // ---------------------------------------------------------
  const threadCount = await prisma.thread.count();

  if (threadCount === 0) {
    console.log("📝 Populating Threads, Posts, Replies, and Moderation data...");

    // THREAD 1: Match Discussion (Dynamic title based on API data)
    const thread1 = await prisma.thread.create({
      data: {
        title: targetMatch 
          ? `${targetMatch.homeTeam} vs ${targetMatch.awayTeam}: Post-Match Discussion` 
          : "Weekend Fixtures: Post-Match Discussion",
        authorId: users[0].id,
        matchId: targetMatch ? targetMatch.id : undefined, // Safely link if match exists
        tags: { create: [{ tagId: tags["Matchday"].id }, { tagId: tags["Fun"].id }] },
        posts: {
          create: [
            { content: "Absolutely massive performance today. The wingers were unplayable!", authorId: users[0].id },
            { content: "VAR decision in the first half was highly controversial in my opinion.", authorId: users[1].id },
          ],
        },
      },
      include: { posts: true }, 
    });

    // Create Poll for Thread 1
    const poll1 = await prisma.poll.create({
      data: {
        threadId: thread1.id,
        question: "Who was the Man of the Match?",
        deadline: new Date(Date.now() + 86400000 * 2), // 2 days from now
        options: {
          create: [{ text: "The Winger" }, { text: "The Playmaker" }, { text: "The Goalkeeper" }],
        },
      },
      include: { options: true },
    });

    // Create Votes for Poll 1
    await prisma.pollVote.createMany({
      data: [
        { optionId: poll1.options[0].id, userId: users[0].id },
        { optionId: poll1.options[0].id, userId: users[3].id },
        { optionId: poll1.options[1].id, userId: users[5].id },
      ],
    });

    // Create Replies for Thread 1's first post
    await prisma.reply.createMany({
      data: [
        { content: "Agreed! Best performance of the season so far.", postId: thread1.posts[0].id, authorId: admin.id },
        { content: "They really tore the defense apart.", postId: thread1.posts[0].id, authorId: users[6].id },
      ],
    });

    // THREAD 2: Upcoming Match/News Discussion
    const thread2 = await prisma.thread.create({
      data: {
        title: "Title Race: Who will drop points next?",
        authorId: users[2].id,
        tags: { create: [{ tagId: tags["Matchday"].id }, { tagId: tags["News"].id }] },
        posts: {
          create: [
            { content: "With key players returning from injury, the top 3 are looking unstoppable.", authorId: users[2].id },
            { content: "Never underestimate away games in this league.", authorId: users[3].id },
            { 
              content: "You guys are delusional lol your team is getting crushed", 
              authorId: users[12].id, // The toxic user
              aiModerationLabel: "TOXICITY",
              aiModerationScore: 0.85,
              aiModerationReason: "Mocking and aggressive language detected."
            },
          ],
        },
      },
      include: { posts: true },
    });

    // THREAD 3: Transfer Rumors
    const thread3 = await prisma.thread.create({
      data: {
        title: "Summer Transfer Window Predictions",
        authorId: users[10].id,
        tags: { create: [{ tagId: tags["Transfers"].id }, { tagId: tags["Rumor"].id }] },
        posts: {
          create: [
            { content: "Who do you guys think will be the biggest signing this summer?", authorId: users[10].id },
          ],
        },
      },
      include: { posts: true }
    });

    // ---------------------------------------------------------
    // 6. MODERATION: REPORTS
    // ---------------------------------------------------------
    await prisma.report.createMany({
      data: [
        { 
          reporterId: users[3].id, 
          reason: "Abusive language and trolling", 
          postId: thread2.posts[2].id, // Reporting the toxic post
          status: "APPROVED",
          aiLabel: "HARASSMENT",
          aiScore: 0.88,
        },
        { 
          reporterId: users[7].id, 
          reason: "Spamming fake links", 
          threadId: thread3.id, 
          status: "PENDING" 
        },
      ],
    });

    // ---------------------------------------------------------
    // 7. MODERATION: APPEALS
    // ---------------------------------------------------------
    await prisma.appeal.createMany({
      data: [
        { 
          userId: users[12].id, // toxic_troll
          reason: "I was just using banter, didn't mean to offend anyone. Please unban me.", 
          status: "REJECTED" 
        },
        { 
          userId: users[13].id, // bot_spammer
          reason: "My account was compromised and someone posted spam links. I have changed my password.", 
          status: "PENDING" 
        }
      ],
    });

    // ---------------------------------------------------------
    // 8. DIGESTS
    // ---------------------------------------------------------
    await prisma.digest.createMany({
      data: [
        { content: "Weekly Premier League Recap: The title race heats up as top teams secure vital wins." },
        { content: "Transfer Market Update: Several top clubs are preparing massive bids ahead of the summer window." }
      ]
    });

    // ---------------------------------------------------------
    // 9. FOLLOWERS
    // ---------------------------------------------------------
    await prisma.follow.createMany({
      skipDuplicates: true, 
      data: [
        { followerId: users[1].id, followingId: users[0].id },
        { followerId: users[2].id, followingId: users[0].id },
        { followerId: users[0].id, followingId: users[10].id },
      ]
    })

    console.log("✅ All threads, posts, polls, and moderation data inserted successfully!");
  } else {
    console.log("⚠️ Threads already exist, skipping thread generation to avoid duplicates.");
  }

}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });