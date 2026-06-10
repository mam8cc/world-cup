import { refreshResults } from "../lib/refresh";

async function main() {
  const result = await refreshResults();
  console.log(`✓ seeded ${result.matches} matches, ${result.teams} teams`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
