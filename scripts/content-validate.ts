import { contentFiles, validateContentFiles } from "../src/content/load";

async function main(): Promise<void> {
  await validateContentFiles();
  console.log("Content validation passed.");
  console.log(`Validated: ${contentFiles.logs}`);
  console.log(`Validated: ${contentFiles.lexicon}`);
  console.log(`Validated: ${contentFiles.thresholds}`);
  console.log(`Validated: ${contentFiles.dailyLife}`);
  console.log(`Validated: ${contentFiles.clinicalEvents}`);
}

main().catch((error: unknown) => {
  console.error("Content validation failed.");
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
