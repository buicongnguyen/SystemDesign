const secondsPerThirtyDayMonth = 30 * 24 * 60 * 60;

const urlShortener = (() => {
  const linksPerMonth = 100_000_000;
  const readsPerWrite = 100;
  const bytesPerRecord = 500;
  const writesPerSecond = linksPerMonth / secondsPerThirtyDayMonth;
  return {
    writesPerSecond,
    readsPerSecond: writesPerSecond * readsPerWrite,
    annualRawGigabytes: linksPerMonth * 12 * bytesPerRecord / 1e9
  };
})();

const flashSale = {
  averageInFlight: 16_700 * 0.25
};

const tradeStudy = (() => {
  const weights = [0.30, 0.20, 0.15, 0.15, 0.10, 0.10];
  const alternatives = {
    onboard: [5, 3, 3, 4, 2, 4],
    cloud: [1, 5, 4, 3, 5, 2],
    hybrid: [5, 5, 3, 2, 4, 3]
  };
  const total = scores => scores.reduce((sum, score, index) => sum + score * weights[index], 0);
  return Object.fromEntries(Object.entries(alternatives).map(([name, scores]) => [name, total(scores)]));
})();

const droneEnergy = (() => {
  const expectedUseWh = 440 + 90 + 40;
  const allowedConsumptionWh = expectedUseWh + 70 + 80;
  const indicatedReserve = 0.20 + 0.02;
  const usableCapacityWh = allowedConsumptionWh / (1 - indicatedReserve);
  return {
    expectedUseWh,
    allowedConsumptionWh,
    indicatedReserve,
    usableCapacityWh,
    remainingWh: usableCapacityWh - allowedConsumptionWh
  };
})();

const hardwareSizing = (() => {
  const framesPerSecond = 4 * 30;
  const pixelsPerSecond = 4 * 1920 * 1080 * 30;
  const payloadBytesPerSecond = pixelsPerSecond * 1.5;
  const sustainedTops = 30e9 * framesPerSecond / 1e12;
  return {
    pixelsPerSecond,
    payloadMegabytesPerSecond: payloadBytesPerSecond / 1e6,
    fourTraversalGigabytesPerSecond: payloadBytesPerSecond * 4 / 1e9,
    sustainedTops,
    peakTopsAtHalfUtilization: sustainedTops / 0.5,
    acceleratorMillijoulesPerFrame: 5 / framesPerSecond * 1000
  };
})();

const embeddedEnergy = {
  milliwattHoursPerDay: 8 / 180 * 1000,
  averageMilliwatts: 8 / (180 * 24) * 1000
};

const acimMapping = (() => {
  const rowSplits = Math.ceil(1024 / 512);
  const logicalColumns = Math.floor(512 / 2);
  const columnSplits = Math.ceil(2048 / logicalColumns);
  const weightSlices = Math.ceil(4 / 2);
  const placements = rowSplits * columnSplits * weightSlices;
  const waves = Math.ceil(placements / 16);
  const activationPhases = Math.ceil(8 / 2);
  return {
    rowSplits,
    columnSplits,
    weightSlices,
    placements,
    waves,
    activationPhases,
    minimumSlots: waves * activationPhases,
    burstAt80: (110 - 80) * 2,
    burstAt100: (110 - 100) * 2,
    drainAt100Seconds: ((110 - 100) * 2) / (100 - 80)
  };
})();

export const reviewedCalculations = Object.freeze({
  urlShortener,
  flashSale,
  tradeStudy,
  droneEnergy,
  hardwareSizing,
  embeddedEnergy,
  acimMapping
});

export function assertReviewedCalculations(documents, backendJs) {
  const near = (actual, expected, tolerance = 1e-9) => Math.abs(actual - expected) <= tolerance;
  const requireTokens = (file, text, tokens) => {
    for (const token of tokens) {
      if (!text.includes(token)) throw new Error(`${file}: reviewed calculation is missing ${token}`);
    }
  };

  if (!near(urlShortener.writesPerSecond, 38.5802469136, 1e-9) || !near(urlShortener.readsPerSecond, 3858.02469136, 1e-8) || urlShortener.annualRawGigabytes !== 600) {
    throw new Error("Internal URL-shortener calculation failed");
  }
  requireTokens("backend.js", backendJs, ["100M new links/month ≈ 40 writes/s", "redirects average ≈ 4K/s", "about 600 GB"]);

  if (flashSale.averageInFlight !== 4175) throw new Error("Internal Little's Law calculation failed");
  requireTokens("backend.html", documents["backend.html"], ["16.7k/s", "0.25 s", "about 4,200 requests in flight"]);

  if (!near(tradeStudy.onboard, 3.75) || !near(tradeStudy.cloud, 3.05) || !near(tradeStudy.hybrid, 3.95)) {
    throw new Error("Internal trade-study calculation failed");
  }
  requireTokens("systems-engineering.html", documents["systems-engineering.html"], ["<td>3.75</td>", "<td>3.05</td>", "<strong>3.95</strong>"]);

  if (droneEnergy.expectedUseWh !== 570 || droneEnergy.allowedConsumptionWh !== 720 || !near(droneEnergy.usableCapacityWh, 923.0769230769, 1e-9) || !near(droneEnergy.remainingWh, 203.0769230769, 1e-9)) {
    throw new Error("Internal drone-energy calculation failed");
  }
  requireTokens("systems-engineering.html", documents["systems-engineering.html"], ["720 ÷ (1 − 0.22) = 923.1 Wh", "203.1 Wh remains", "20% acceptance lower bound"]);

  if (!near(hardwareSizing.payloadMegabytesPerSecond, 373.248) || !near(hardwareSizing.fourTraversalGigabytesPerSecond, 1.492992) || hardwareSizing.sustainedTops !== 3.6 || hardwareSizing.peakTopsAtHalfUtilization !== 7.2 || !near(hardwareSizing.acceleratorMillijoulesPerFrame, 41.6666666667, 1e-9)) {
    throw new Error("Internal hardware-sizing calculation failed");
  }
  requireTokens("hardware.html", documents["hardware.html"], ["about 373 MB/s", "about 1.49 GB/s", "3.6 TOPS sustained", "7.2 peak TOPS", "41.7 mJ/frame"]);

  if (!near(embeddedEnergy.milliwattHoursPerDay, 44.4444444444, 1e-9) || !near(embeddedEnergy.averageMilliwatts, 1.85185185185, 1e-9)) {
    throw new Error("Internal embedded-energy calculation failed");
  }
  requireTokens("embedded.html", documents["embedded.html"], ["44.4 mWh/day", "1.85 mW average"]);

  if (acimMapping.rowSplits !== 2 || acimMapping.columnSplits !== 8 || acimMapping.weightSlices !== 2 || acimMapping.placements !== 32 || acimMapping.waves !== 2 || acimMapping.activationPhases !== 4 || acimMapping.minimumSlots !== 8 || acimMapping.burstAt80 !== 60 || acimMapping.burstAt100 !== 20 || acimMapping.drainAt100Seconds !== 1) {
    throw new Error("Internal ACiM mapping or backlog calculation failed");
  }
  requireTokens("npu-acim.html", documents["npu-acim.html"], ["2 × 8 × 2 = 32", "W = ceil(32 ÷ 16) = 2", "W × P_a = 2 × 4 = 8", "(110 − 80) × 2 = 60", "(110 − 100) × 2 = 20", "20 ÷ (100 − 80) = 1 s"]);
}
