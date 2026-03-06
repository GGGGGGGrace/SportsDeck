import { getCompetition } from "./app/lib/footballApi";

async function main() {
  const comp = await getCompetition();
  console.log("Competition data:", JSON.stringify(comp.currentSeason, null, 2));
}

main().catch(console.error);
