import { getMatches } from "./app/lib/footballApi";
import { prisma } from "./app/lib/prisma";

async function main() {
  console.log("Syncing matches...");
  await getMatches({ matchday: 1 }); // Just pick matchday 1 or don't specify
  
  const threads = await prisma.thread.findMany({
    include: { author: true }
  });
  
  console.log("Threads created by defaultadmin:");
  console.dir(threads, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
