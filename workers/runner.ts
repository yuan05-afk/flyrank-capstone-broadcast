import { workerService } from "../services/campaign.service";

async function loop() {
  console.log("[worker] started");
  for (;;) {
    try {
      const result = await workerService.tickOnce();
      if (result.processed) console.log("[worker]", result);
    } catch (err) {
      console.error("[worker] tick failed", err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

void loop();
