/**
 * Custom reporter minimal — titik awal untuk dikembangkan.
 *
 * Implements Playwright's Reporter interface.
 * Dokumentasi: https://playwright.dev/docs/api/class-reporter
 *
 * Contoh pengembangan:
 *   - Kirim hasil ke webhook (Slack, Teams)
 *   - Upload ke test management tool (XRAY, TestRail)
 *   - Generate ringkasan JSON per tag
 */
class CustomReporter {
  onBegin(config, suite) {
    const total = suite.allTests().length;
    console.log(`\n[reporter] Mulai: ${total} test | ${config.workers} worker(s)`);
  }

  onTestEnd(test, result) {
    if (result.status === 'failed') {
      console.log(`[reporter] GAGAL: ${test.title} (${result.duration}ms)`);
    }
  }

  onEnd(result) {
    console.log(`\n[reporter] Selesai: ${result.status} | durasi ${(result.duration / 1000).toFixed(1)}s`);
  }
}

module.exports = CustomReporter;
