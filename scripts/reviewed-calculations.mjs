const secondsPerDay = 24 * 60 * 60;
const secondsPerThirtyDayMonth = 30 * secondsPerDay;

const urlShortener = (() => {
  const inputs = Object.freeze({
    linksPerMonth: 100_000_000,
    readsPerWrite: 100,
    bytesPerRecord: 500,
    retainedMonths: 12
  });
  const writesPerSecond = inputs.linksPerMonth / secondsPerThirtyDayMonth;
  return Object.freeze({
    inputs,
    writesPerSecond,
    readsPerSecond: writesPerSecond * inputs.readsPerWrite,
    annualRawGigabytes: inputs.linksPerMonth * inputs.retainedMonths * inputs.bytesPerRecord / 1e9
  });
})();

const feedSizing = (() => {
  const inputs = Object.freeze({
    dailyUsers: 100_000_000,
    feedOpensPerUserPerDay: 10,
    postsPerDay: 10_000_000,
    averageFollowers: 200
  });
  return Object.freeze({
    inputs,
    averageFeedReadsPerSecond: inputs.dailyUsers * inputs.feedOpensPerUserPerDay / secondsPerDay,
    naiveTimelineInsertionsPerDay: inputs.postsPerDay * inputs.averageFollowers
  });
})();

const chatSizing = (() => {
  const inputs = Object.freeze({
    dailyUsers: 50_000_000,
    concurrentConnections: 5_000_000,
    messagesPerDay: 1_000_000_000
  });
  return Object.freeze({
    inputs,
    averageMessagesPerSecond: inputs.messagesPerDay / secondsPerDay
  });
})();

const flashSale = (() => {
  const inputs = Object.freeze({
    attempts: 2_000_000,
    durationSeconds: 600,
    burstFactor: 5,
    meanTimeSeconds: 0.25,
    responseBytes: 2_000,
    conversionRate: 0.01,
    retriesPerLayer: 2,
    retryLayers: 3
  });
  const averageAttemptsPerSecond = inputs.attempts / inputs.durationSeconds;
  const peakAttemptsPerSecond = averageAttemptsPerSecond * inputs.burstFactor;
  const responseBytesPerSecond = peakAttemptsPerSecond * inputs.responseBytes;
  return Object.freeze({
    inputs,
    averageAttemptsPerSecond,
    peakAttemptsPerSecond,
    averageInFlight: peakAttemptsPerSecond * inputs.meanTimeSeconds,
    ordersPerSecond: peakAttemptsPerSecond * inputs.conversionRate,
    responseMegabytesPerSecond: responseBytesPerSecond / 1e6,
    responseMegabitsPerSecond: responseBytesPerSecond * 8 / 1e6,
    nestedAttemptAmplification: (1 + inputs.retriesPerLayer) ** inputs.retryLayers
  });
})();

const tradeStudy = (() => {
  const criteria = Object.freeze([
    Object.freeze({ key: "safe-without-link", label: "Safe without link", weight: 0.30, onboard: 5, cloud: 1, hybrid: 5 }),
    Object.freeze({ key: "perception", label: "Perception capability", weight: 0.20, onboard: 3, cloud: 5, hybrid: 5 }),
    Object.freeze({ key: "energy", label: "Energy efficiency", weight: 0.15, onboard: 3, cloud: 4, hybrid: 3 }),
    Object.freeze({ key: "lifecycle-cost", label: "Lifecycle cost", weight: 0.15, onboard: 4, cloud: 3, hybrid: 2 }),
    Object.freeze({ key: "update-flexibility", label: "Update flexibility", weight: 0.10, onboard: 2, cloud: 5, hybrid: 4 }),
    Object.freeze({ key: "certification", label: "Certification clarity", weight: 0.10, onboard: 4, cloud: 2, hybrid: 3 })
  ]);
  const alternatives = ["onboard", "cloud", "hybrid"];
  const totals = Object.freeze(Object.fromEntries(alternatives.map(name => [
    name,
    criteria.reduce((sum, criterion) => sum + criterion.weight * criterion[name], 0)
  ])));
  const sensitivityTotals = Object.freeze(Object.fromEntries(alternatives.map(name => [
    name,
    totals[name] - 0.10 * criteria[0][name] + 0.10 * criteria[3][name]
  ])));
  return Object.freeze({
    criteria,
    totals,
    sensitivityTotals
  });
})();

const droneEnergy = (() => {
  const inputs = Object.freeze({
    cruiseWh: 440,
    takeoffLandingWh: 90,
    avionicsPayloadWh: 40,
    contingencyWh: 70,
    analysisGrowthWh: 80,
    acceptanceReserveFraction: 0.20,
    oneSidedGuardBandFraction: 0.02
  });
  const expectedUseWh = inputs.cruiseWh + inputs.takeoffLandingWh + inputs.avionicsPayloadWh;
  const allowedConsumptionWh = expectedUseWh + inputs.contingencyWh + inputs.analysisGrowthWh;
  const decisionThresholdReserve = inputs.acceptanceReserveFraction + inputs.oneSidedGuardBandFraction;
  const usableCapacityWh = allowedConsumptionWh / (1 - decisionThresholdReserve);
  return Object.freeze({
    inputs,
    expectedUseWh,
    allowedConsumptionWh,
    decisionThresholdReserve,
    usableCapacityWh,
    remainingWh: usableCapacityWh - allowedConsumptionWh
  });
})();

const statisticalEvidence = (() => {
  const inputs = Object.freeze({
    alpha: 0.05,
    targetSuccess: 0.99,
    planningProportion: 0.99,
    halfWidth: 0.01,
    z95: 1.96
  });
  const zeroFailureSample = Math.ceil(Math.log(inputs.alpha) / Math.log(inputs.targetSuccess));
  return Object.freeze({
    inputs,
    approximatePrecisionSample: Math.ceil(
      inputs.z95 ** 2 * inputs.planningProportion * (1 - inputs.planningProportion) / inputs.halfWidth ** 2
    ),
    zeroFailureSample,
    zeroFailureLowerBound: inputs.alpha ** (1 / zeroFailureSample),
    passProbabilityAtTarget: inputs.targetSuccess ** zeroFailureSample
  });
})();

const hardwareSizing = (() => {
  const inputs = Object.freeze({
    streams: 4,
    width: 1920,
    height: 1080,
    framesPerSecondPerStream: 30,
    postIspBytesPerPixel: 1.5,
    fullFrameTransferEquivalents: 4,
    gigaOperationsPerCameraFrame: 30,
    measuredEndToEndUtilization: 0.5,
    acceleratorAverageWatts: 5
  });
  const cameraFramesPerSecond = inputs.streams * inputs.framesPerSecondPerStream;
  const pixelsPerSecond = cameraFramesPerSecond * inputs.width * inputs.height;
  const payloadBytesPerSecond = pixelsPerSecond * inputs.postIspBytesPerPixel;
  const sustainedTops = inputs.gigaOperationsPerCameraFrame * 1e9 * cameraFramesPerSecond / 1e12;
  return Object.freeze({
    inputs,
    cameraFramesPerSecond,
    pixelsPerSecond,
    payloadMegabytesPerSecond: payloadBytesPerSecond / 1e6,
    transferEquivalentGigabytesPerSecond: payloadBytesPerSecond * inputs.fullFrameTransferEquivalents / 1e9,
    sustainedTops,
    minimumPeakTopsAtMeasuredUtilization: sustainedTops / inputs.measuredEndToEndUtilization,
    acceleratorMillijoulesPerCameraFrame: inputs.acceleratorAverageWatts / cameraFramesPerSecond * 1000
  });
})();

function fixedPriorityResponse(tasks, taskIndex) {
  const task = tasks[taskIndex];
  let response = task.executionMs + task.blockingMs;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const interference = tasks.slice(0, taskIndex).reduce((sum, higherPriority) => (
      sum + Math.ceil((response + higherPriority.jitterMs) / higherPriority.periodMs) * higherPriority.executionMs
    ), 0);
    const next = task.executionMs + task.blockingMs + interference;
    if (Math.abs(next - response) <= 1e-12) return next;
    response = next;
  }
  throw new Error(`Fixed-priority response iteration did not converge for ${task.name}`);
}

const embeddedTiming = (() => {
  const tasks = Object.freeze([
    Object.freeze({ name: "capture", executionMs: 0.08, periodMs: 1, deadlineMs: 1, blockingMs: 0, jitterMs: 0 }),
    Object.freeze({ name: "estimator", executionMs: 0.35, periodMs: 5, deadlineMs: 5, blockingMs: 0, jitterMs: 0 }),
    Object.freeze({ name: "control", executionMs: 0.25, periodMs: 5, deadlineMs: 5, blockingMs: 0, jitterMs: 0 }),
    Object.freeze({ name: "communications", executionMs: 0.8, periodMs: 20, deadlineMs: 20, blockingMs: 0, jitterMs: 0 })
  ]);
  const responseTimesMs = Object.freeze(tasks.map((task, index) => fixedPriorityResponse(tasks, index)));
  return Object.freeze({
    tasks,
    utilization: tasks.reduce((sum, task) => sum + task.executionMs / task.periodMs, 0),
    responseTimesMs,
    schedulable: tasks.every((task, index) => responseTimesMs[index] <= task.deadlineMs)
  });
})();

const embeddedEnergy = (() => {
  const inputs = Object.freeze({ batteryWh: 8, targetDays: 180 });
  return Object.freeze({
    inputs,
    milliwattHoursPerDay: inputs.batteryWh / inputs.targetDays * 1000,
    averageMilliwatts: inputs.batteryWh / (inputs.targetDays * 24) * 1000
  });
})();

const controlLoop = (() => {
  const inputs = Object.freeze({
    sampleRateHz: 500,
    crossoverHz: 20,
    pathMs: 1.30,
    deadlineMs: 1.50,
    nominalPhaseMarginDegrees: 60,
    targetPhaseMarginDegrees: 45,
    releaseJitterMs: 0.15,
    apertureJitterMs: 0.02
  });
  const samplePeriodMs = 1000 / inputs.sampleRateHz;
  const pathPhaseDegrees = 360 * inputs.crossoverHz * inputs.pathMs / 1000;
  const zohPhaseDegrees = 360 * inputs.crossoverHz * (samplePeriodMs / 2) / 1000;
  return Object.freeze({
    inputs,
    samplePeriodMs,
    samplesPerCrossoverPeriod: inputs.sampleRateHz / inputs.crossoverHz,
    deadlineSlackMs: inputs.deadlineMs - inputs.pathMs,
    pathPhaseDegrees,
    zohPhaseDegrees,
    screeningPhaseMarginDegrees: inputs.nominalPhaseMarginDegrees - pathPhaseDegrees - zohPhaseDegrees,
    releaseJitterPhaseDegrees: 360 * inputs.crossoverHz * inputs.releaseJitterMs / 1000,
    apertureJitterPhaseDegrees: 360 * inputs.crossoverHz * inputs.apertureJitterMs / 1000,
    phasePenaltyAt15HzDegrees: 360 * 15 * (inputs.pathMs + samplePeriodMs / 2) / 1000,
    doubledReleasePathMs: inputs.pathMs + inputs.releaseJitterMs,
    increasedFilterPathMs: inputs.pathMs + 0.30,
    phasePenaltyAt35HzDegrees: 360 * 35 * (inputs.pathMs + samplePeriodMs / 2) / 1000
  });
})();

function calculateAcimGeometry(inputs) {
  const logicalColumns = Math.floor(inputs.arrayColumns / inputs.signedPhysicalColumnsPerLogicalValue);
  const kSplits = Math.ceil(inputs.inputDimensionK / inputs.arrayRows);
  const mSplits = Math.ceil(inputs.outputDimensionM / logicalColumns);
  const weightSlices = Math.ceil(inputs.weightBits / inputs.cellBits);
  const placements = kSplits * mSplits * weightSlices;
  const waves = Math.ceil(placements / inputs.availableArrays);
  const activationPhases = Math.ceil(inputs.activationBits / inputs.driveBits);
  return Object.freeze({
    logicalColumns,
    kSplits,
    mSplits,
    weightSlices,
    placements,
    waves,
    activationPhases,
    minimumSlots: waves * activationPhases,
    macsPerVector: inputs.inputDimensionK * inputs.outputDimensionM,
    geometricUtilization: inputs.inputDimensionK * inputs.outputDimensionM
      / (kSplits * inputs.arrayRows * mSplits * logicalColumns)
  });
}

const acimMapping = (() => {
  const inputs = Object.freeze({
    inputDimensionK: 512,
    outputDimensionM: 512,
    arrayRows: 256,
    arrayColumns: 128,
    signedPhysicalColumnsPerLogicalValue: 2,
    weightBits: 4,
    cellBits: 2,
    activationBits: 8,
    driveBits: 2,
    availableArrays: 16,
    visionSteadyPerSecond: 30,
    visionBurstPerSecond: 60,
    audioSteadyPerSecond: 50,
    initialBacklog: 0,
    recoveryServicePerSecond: 100,
    burstSeconds: 2
  });
  const steadyArrivalPerSecond = inputs.visionSteadyPerSecond + inputs.audioSteadyPerSecond;
  const burstArrivalPerSecond = inputs.visionBurstPerSecond + inputs.audioSteadyPerSecond;
  const geometry = calculateAcimGeometry(inputs);
  const endBacklog = servicePerSecond => Math.max(
    0,
    inputs.initialBacklog + (burstArrivalPerSecond - servicePerSecond) * inputs.burstSeconds
  );
  const peakBacklog = servicePerSecond => inputs.initialBacklog + Math.max(
    0,
    (burstArrivalPerSecond - servicePerSecond) * inputs.burstSeconds
  );
  const burstAt80 = endBacklog(steadyArrivalPerSecond);
  const burstAt100 = endBacklog(inputs.recoveryServicePerSecond);
  return Object.freeze({
    inputs,
    ...geometry,
    steadyArrivalPerSecond,
    burstArrivalPerSecond,
    burstAt80,
    burstAt100,
    peakBurstAt80: peakBacklog(steadyArrivalPerSecond),
    peakBurstAt100: peakBacklog(inputs.recoveryServicePerSecond),
    drainAt100Seconds: burstAt100 / (inputs.recoveryServicePerSecond - steadyArrivalPerSecond)
  });
})();

const acimAxisProbe = calculateAcimGeometry({
  ...acimMapping.inputs,
  inputDimensionK: 768,
  outputDimensionM: 384
});

export const reviewedCalculations = Object.freeze({
  urlShortener,
  feedSizing,
  chatSizing,
  flashSale,
  tradeStudy,
  droneEnergy,
  statisticalEvidence,
  hardwareSizing,
  embeddedTiming,
  embeddedEnergy,
  controlLoop,
  acimMapping
});

export function assertReviewedCalculations(documents, backendJs) {
  const near = (actual, expected, tolerance = 1e-9) => Math.abs(actual - expected) <= tolerance;
  const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const visibleText = html => html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const requireTokens = (file, text, tokens) => {
    for (const token of tokens) {
      if (!text.includes(token)) throw new Error(`${file}: reviewed calculation is missing ${token}`);
    }
  };
  const calculationElement = (file, name, tagName) => {
    const html = documents[file];
    const match = html.match(new RegExp(
      `<${tagName}\\b[^>]*\\bdata-calculation=["']${escapePattern(name)}["'][^>]*>([\\s\\S]*?)<\\/${tagName}>`,
      "i"
    ));
    if (!match) throw new Error(`${file}: missing ${tagName} calculation element ${name}`);
    return match;
  };
  const requireCalculationData = (file, name, expected) => {
    const html = documents[file];
    const tag = html.match(new RegExp(`<[^>]+\\bdata-calculation=["']${escapePattern(name)}["'][^>]*>`, "i"))?.[0];
    if (!tag) throw new Error(`${file}: missing structured calculation marker ${name}`);
    const attributes = Object.fromEntries(
      [...tag.matchAll(/\b(data-[\w-]+)=["']([^"']*)["']/gi)].map(match => [match[1].toLowerCase(), match[2]])
    );
    for (const [attribute, value] of Object.entries(expected)) {
      if (attributes[`data-${attribute}`] !== String(value)) {
        throw new Error(`${file}: ${name} expects data-${attribute}="${value}"`);
      }
    }
  };
  const requireCalculationCells = (file, name, expected) => {
    const row = calculationElement(file, name, "tr");
    const actual = [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
      .map(match => visibleText(match[1]));
    if (actual.length !== expected.length || actual.some((value, index) => value !== String(expected[index]))) {
      throw new Error(`${file}: ${name} visible cells must be ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
    }
  };
  const requireCalculationTokens = (file, name, tagName, tokens) => {
    const element = calculationElement(file, name, tagName);
    requireTokens(file, element[1], tokens);
  };

  if (!near(urlShortener.writesPerSecond, 38.5802469136, 1e-9) || !near(urlShortener.readsPerSecond, 3858.02469136, 1e-8) || urlShortener.annualRawGigabytes !== 600) {
    throw new Error("Internal URL-shortener calculation failed");
  }
  requireTokens("backend.js", backendJs, ["100M new links/month ≈ 40 writes/s", "redirects average ≈ 4K/s", "about 600 GB", "For this exercise, assume a 5–10× peak"]);

  if (!near(feedSizing.averageFeedReadsPerSecond, 11574.0740740741, 1e-9) || feedSizing.naiveTimelineInsertionsPerDay !== 2_000_000_000) {
    throw new Error("Internal feed-sizing calculation failed");
  }
  requireTokens("backend.js", backendJs, ["100M daily users", "roughly 12K reads/s average", "10M posts/day", "200 followers on average", "2B timeline insertions/day"]);

  if (!near(chatSizing.averageMessagesPerSecond, 11574.0740740741, 1e-9)) {
    throw new Error("Internal chat-sizing calculation failed");
  }
  requireTokens("backend.js", backendJs, ["50M daily users", "5M concurrent connections", "1B messages/day", "about 12K/s"]);

  if (!near(flashSale.averageAttemptsPerSecond, 3333.3333333333, 1e-9) || !near(flashSale.peakAttemptsPerSecond, 16666.6666666667, 1e-9) || !near(flashSale.averageInFlight, 4166.6666666667, 1e-9) || !near(flashSale.ordersPerSecond, 166.6666666667, 1e-9) || !near(flashSale.responseMegabytesPerSecond, 33.3333333333, 1e-9) || !near(flashSale.responseMegabitsPerSecond, 266.6666666667, 1e-9) || flashSale.nestedAttemptAmplification !== 27) {
    throw new Error("Internal flash-sale calculation failed");
  }
  requireCalculationData("backend.html", "flash-sale", {
    attempts: 2_000_000,
    "duration-seconds": 600,
    "burst-factor": 5,
    "mean-seconds": 0.25,
    "response-bytes": 2_000,
    "conversion-rate": 0.01,
    "retries-per-layer": 2,
    "retry-layers": 3
  });
  requireTokens("backend.html", documents["backend.html"], [
    "two million purchase attempts arrive over ten minutes",
    "peak traffic is five times the average",
    "the synchronous path targets 250 ms",
    "responses average 2 kB",
    "one percent of attempts become orders",
    "3.3k attempts/s",
    "16.7k attempts/s",
    "about 4,200 requests in flight",
    "about 167 orders/s",
    "about 33 MB/s (≈267 Mb/s)",
    "3³ = 27"
  ]);

  if (!near(tradeStudy.totals.onboard, 3.75) || !near(tradeStudy.totals.cloud, 3.05) || !near(tradeStudy.totals.hybrid, 3.95) || !near(tradeStudy.sensitivityTotals.onboard, 3.65) || !near(tradeStudy.sensitivityTotals.hybrid, 3.65)) {
    throw new Error("Internal trade-study calculation failed");
  }
  for (const criterion of tradeStudy.criteria) {
    requireCalculationData("systems-engineering.html", `trade-${criterion.key}`, {
      weight: criterion.weight.toFixed(2),
      onboard: criterion.onboard,
      cloud: criterion.cloud,
      hybrid: criterion.hybrid
    });
    requireCalculationCells("systems-engineering.html", `trade-${criterion.key}`, [
      criterion.label,
      `${criterion.weight * 100}%`,
      criterion.onboard,
      criterion.cloud,
      criterion.hybrid
    ]);
  }
  requireCalculationData("systems-engineering.html", "trade-totals", {
    weight: 1,
    onboard: 3.75,
    cloud: 3.05,
    hybrid: 3.95
  });
  requireCalculationCells("systems-engineering.html", "trade-totals", ["Illustrative arithmetic total", "100%", 3.75, 3.05, 3.95]);
  requireTokens("systems-engineering.html", documents["systems-engineering.html"], ["<td>3.75</td>", "<td>3.05</td>", "<strong>3.95</strong>", "makes both 3.65"]);
  requireCalculationTokens("systems-engineering.html", "drone-optimization-contract", "div", [
    "M(x) ≤ M_max",
    "E_remaining,ref(x) = E_initial,ref(x) − E_discharged,ref(x)",
    "E_remaining,ref(x) ÷ C_u,ref(x) ≥ R_min",
    "only for the controlled full-charge entry: E_initial,ref(x) = C_u,ref(x)",
    "L_sense→actuate(x,u) ≤ L_max, ∀u ∈ U_required",
    "0 ≤ t_enter(LINK_LOSS_CONTINGENCY,x,u) − t_declare ≤ T_mode,max, ∀u ∈ U_link_loss",
    "0 ≤ t_reach(RECOVERY_APPROACH_GATE,x,u) − t_declare ≤ T_transit,max(u), ∀u ∈ U_link_loss_entry",
    "0 ≤ t_enter(LANDED_SAFE,x,u) − t_reach(RECOVERY_APPROACH_GATE,x,u) ≤ T_land,max, ∀u ∈ U_landing_applicable",
    "t_enter is the first entry into the named mode or state after its trigger"
  ]);

  if (droneEnergy.expectedUseWh !== 570 || droneEnergy.allowedConsumptionWh !== 720 || !near(droneEnergy.usableCapacityWh, 923.0769230769, 1e-9) || !near(droneEnergy.remainingWh, 203.0769230769, 1e-9)) {
    throw new Error("Internal drone-energy calculation failed");
  }
  requireCalculationData("systems-engineering.html", "drone-energy", {
    "cruise-wh": 440,
    "takeoff-landing-wh": 90,
    "avionics-payload-wh": 40,
    "contingency-wh": 70,
    "analysis-growth-wh": 80,
    "acceptance-reserve-fraction": 0.2,
    "one-sided-guard-band-fraction": 0.02
  });
  requireTokens("systems-engineering.html", documents["systems-engineering.html"], [
    "expected use is 570 Wh = 440 Wh cruise + 90 Wh takeoff/landing + 40 Wh avionics/payload",
    "Add 70 Wh contingency consumption and 80 Wh analysis/growth allowance",
    "physical requirement is R<sub>ref</sub>",
    "two-percentage-point one-sided guard band",
    "R_result − 2 percentage points ≥ 20%",
    "720 ÷ (1 − 0.22) = 923.1 Wh",
    "203.1 Wh physically remains",
    "E<sub>discharged,ref</sub>",
    "E<sub>remaining,ref</sub> = E<sub>initial,ref</sub> − E<sub>discharged,ref</sub>",
    "E<sub>initial,ref</sub> = C<sub>u,ref</sub>",
    "BMS R<sub>indicated</sub>",
    "integrate signed net battery power"
  ]);

  if (statisticalEvidence.approximatePrecisionSample !== 381
    || statisticalEvidence.zeroFailureSample !== 299
    || !near(statisticalEvidence.zeroFailureLowerBound, 0.9900308532, 1e-9)
    || !near(statisticalEvidence.passProbabilityAtTarget, 0.0495362566, 1e-9)) {
    throw new Error("Internal statistical-evidence calculation failed");
  }
  requireCalculationData("systems-engineering.html", "statistical-evidence", {
    alpha: 0.05,
    "target-success": 0.99,
    "planning-proportion": 0.99,
    "half-width": 0.01,
    "zero-failure-sample": 299
  });
  requireTokens("systems-engineering.html", documents["systems-engineering.html"], [
    "n ≈ z² × p* × (1 − p*) ÷ E²",
    "n ≈ 381",
    "L = &alpha;^(1/n)",
    "n = ceil[ln(&alpha;) ÷ ln(R₀)]",
    "n = 299 independent successes",
    "One-sided exact lower bound = 99.003%",
    "0.99<sup>299</sup> ≈ 4.95%"
  ]);

  if (hardwareSizing.cameraFramesPerSecond !== 120 || !near(hardwareSizing.payloadMegabytesPerSecond, 373.248) || !near(hardwareSizing.transferEquivalentGigabytesPerSecond, 1.492992) || hardwareSizing.sustainedTops !== 3.6 || hardwareSizing.minimumPeakTopsAtMeasuredUtilization !== 7.2 || !near(hardwareSizing.acceleratorMillijoulesPerCameraFrame, 41.6666666667, 1e-9)) {
    throw new Error("Internal hardware-sizing calculation failed");
  }
  requireCalculationData("hardware.html", "hardware-sizing", {
    streams: 4,
    width: 1920,
    height: 1080,
    "fps-per-stream": 30,
    "post-isp-bytes-per-pixel": 1.5,
    "full-frame-transfer-equivalents": 4,
    "giga-operations-per-camera-frame": 30,
    "measured-end-to-end-utilization": 0.5,
    "accelerator-average-watts": 5
  });
  requireTokens("hardware.html", documents["hardware.html"], [
    "four 1920 × 1080 cameras at 30 frames/s",
    "1.5 bytes per active pixel",
    "30 GOp per camera-frame",
    "four aggregate full-frame transfer-equivalents",
    "50% measured end-to-end utilization",
    "about 373 MB/s",
    "about 1.49 GB/s",
    "3.6 TOPS sustained",
    "7.2 peak TOPS is the arithmetic minimum",
    "41.7 mJ/frame",
    "one frame means one camera-frame"
  ]);

  if (!near(embeddedTiming.utilization, 0.24) || !embeddedTiming.schedulable || !embeddedTiming.responseTimesMs.every((value, index) => near(value, [0.08, 0.43, 0.68, 1.56][index]))) {
    throw new Error("Internal embedded fixed-priority response-time calculation failed");
  }
  requireCalculationData("embedded.html", "embedded-timing", {
    "execution-ms": "0.08,0.35,0.25,0.8",
    "period-ms": "1,5,5,20",
    "deadline-ms": "1,5,5,20",
    "priority-order": "capture,estimator,control,communications",
    "blocking-ms": "0,0,0,0",
    "jitter-ms": "0,0,0,0"
  });
  requireTokens("embedded.html", documents["embedded.html"], [
    "sensor capture 80 μs every 1 ms",
    "estimator 350 μs every 5 ms",
    "control update 250 μs every 5 ms",
    "communications service 800 μs every 20 ms",
    "set each relative deadline equal to its period",
    "set blocking and release jitter to zero",
    "0.08 + 0.07 + 0.05 + 0.04 = 0.24",
    "0.08 ms for capture",
    "0.43 ms for estimator",
    "0.68 ms for control",
    "1.56 ms for communications"
  ]);

  if (!near(embeddedEnergy.milliwattHoursPerDay, 44.4444444444, 1e-9) || !near(embeddedEnergy.averageMilliwatts, 1.85185185185, 1e-9)) {
    throw new Error("Internal embedded-energy calculation failed");
  }
  requireTokens("embedded.html", documents["embedded.html"], ["8 Wh", "180 days", "44.4 mWh/day", "1.85 mW average"]);

  if (controlLoop.samplePeriodMs !== 2
    || controlLoop.samplesPerCrossoverPeriod !== 25
    || !near(controlLoop.deadlineSlackMs, 0.20)
    || !near(controlLoop.pathPhaseDegrees, 9.36)
    || !near(controlLoop.zohPhaseDegrees, 7.20)
    || !near(controlLoop.screeningPhaseMarginDegrees, 43.44)
    || !near(controlLoop.releaseJitterPhaseDegrees, 1.08)
    || !near(controlLoop.apertureJitterPhaseDegrees, 0.144)
    || !near(controlLoop.phasePenaltyAt15HzDegrees, 12.42)
    || !near(controlLoop.doubledReleasePathMs, 1.45)
    || !near(controlLoop.increasedFilterPathMs, 1.60)
    || !near(controlLoop.phasePenaltyAt35HzDegrees, 28.98)) {
    throw new Error("Internal embedded control-loop screening calculation failed");
  }
  requireCalculationData("embedded.html", "control-loop", {
    "sample-rate-hz": 500,
    "crossover-hz": 20,
    "path-ms": "1.30",
    "deadline-ms": "1.50",
    "nominal-phase-margin-deg": 60,
    "target-phase-margin-deg": 45
  });
  requireTokens("embedded.html", documents["embedded.html"], [
    "T<sub>s</sub> = 1 ÷ 500 Hz = 2.00 ms",
    "That is 25 samples per 20 Hz crossover period",
    "φ<sub>path</sub> ≈ −360 f<sub>c</sub> τ<sub>path</sub> = −9.36°",
    "φ<sub>ZOH</sub> ≈ −360 f<sub>c</sub>(T<sub>s</sub> ÷ 2) = −7.20°",
    "PM ≈ 60° − 9.36° − 7.20° = 43.44°",
    "0.20 ms slack",
    "360 × 20 Hz × 0.00015 s = 1.08°",
    "47.58° remains",
    "about 29.0°"
  ]);

  if (acimMapping.steadyArrivalPerSecond !== 80 || acimMapping.burstArrivalPerSecond !== 110 || acimMapping.logicalColumns !== 64 || acimMapping.kSplits !== 2 || acimMapping.mSplits !== 8 || acimMapping.weightSlices !== 2 || acimMapping.placements !== 32 || acimMapping.waves !== 2 || acimMapping.activationPhases !== 4 || acimMapping.minimumSlots !== 8 || acimMapping.macsPerVector !== 262_144 || acimMapping.geometricUtilization !== 1 || acimMapping.burstAt80 !== 60 || acimMapping.burstAt100 !== 20 || acimMapping.peakBurstAt80 !== 60 || acimMapping.peakBurstAt100 !== 20 || acimMapping.drainAt100Seconds !== 1) {
    throw new Error("Internal ACiM mapping or backlog calculation failed");
  }
  if (acimAxisProbe.kSplits !== 3 || acimAxisProbe.mSplits !== 6 || acimAxisProbe.placements !== 36 || acimAxisProbe.waves !== 3 || acimAxisProbe.minimumSlots !== 12 || acimAxisProbe.macsPerVector !== 294_912 || acimAxisProbe.geometricUtilization !== 1) {
    throw new Error("Internal ACiM M/K axis probe failed");
  }
  requireCalculationData("npu-acim.html", "acim-mapping", {
    "input-dimension-k": 512,
    "output-dimension-m": 512,
    "array-rows": 256,
    "array-columns": 128,
    "signed-physical-columns-per-logical-value": 2,
    "weight-bits": 4,
    "cell-bits": 2,
    "activation-bits": 8,
    "drive-bits": 2,
    "available-arrays": 16
  });
  requireCalculationData("npu-acim.html", "acim-traffic", {
    "vision-steady-per-second": 30,
    "vision-burst-per-second": 60,
    "audio-steady-per-second": 50,
    "initial-backlog": 0,
    "burst-seconds": 2,
    "service-candidates-per-second": "80,100,110,120"
  });
  requireTokens("npu-acim.html", documents["npu-acim.html"], [
    "Map a 512 × 512 matrix onto 16 one-array tiles",
    "each array is 256 × 128",
    "differential signed encoding costs two physical columns",
    "weights are 4-bit in 2-bit cells",
    "8-bit activations use a 2-bit drive path",
    "Sixteen one-array tiles",
    "vision arrives at 30 requests/s steady and bursts to 60 requests/s for 2 s",
    "audio arrives at 50 windows/s steady",
    "80-request/s steady mix",
    "110-request/s burst",
    "<th scope=\"row\">80 requests/s</th>",
    "<th scope=\"row\">100 requests/s</th>",
    "<th scope=\"row\">110 requests/s</th>",
    "<th scope=\"row\">120 requests/s</th>",
    "C_logical = floor(128 ÷ 2) = 64",
    "2 × 8 × 2 = 32",
    "W = ceil(32 ÷ 16) = 2",
    "W × P_a = 2 × 4 = 8",
    "K = 768, M = 384 → N_K = 3, N_M = 6",
    "512 × 512 = 262,144",
    "empty queue at burst onset, B₀ = 0",
    "B_end = max(0, B₀ + (λ_burst − μ)T)",
    "B_peak = B₀ + max(0, (λ_burst − μ)T)",
    "(110 − 80) × 2 = 60",
    "(110 − 100) × 2 = 20",
    "20 ÷ (100 − 80) = 1 s"
  ]);
}
