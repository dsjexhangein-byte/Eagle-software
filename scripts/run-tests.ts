import { TestSuiteRunner } from '../server/services/TestSuiteRunner.js';

async function main() {
  console.log('Running EaglePay automated test suite...');
  const result = await TestSuiteRunner.runAllTests();
  console.log(`\n========================================`);
  console.log(`RESULTS: ${result.passed}/${result.total} passed (${result.failed} failed)`);
  console.log(`========================================\n`);

  for (const r of result.results) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${symbol} [${r.category}] ${r.name} (${r.durationMs}ms)`);
    if (!r.passed && r.details) {
      console.log(`    Error: ${r.details}`);
    }
  }

  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
