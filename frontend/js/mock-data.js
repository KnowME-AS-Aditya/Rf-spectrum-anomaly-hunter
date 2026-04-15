/* ═══════════════════════════════════════════════════════════════
   MOCK DATA GENERATOR
   Simulates RF spectrum data, anomaly events, and edge telemetry
   for dashboard prototyping without backend/hardware.
   ═══════════════════════════════════════════════════════════════ */

const MockData = (() => {
    // ── CONSTANTS ──
    const CENTER_FREQ = 433.92;
    const BAND_START = 433.0;
    const BAND_END = 434.0;
    const FREQ_BINS = 128;
    const THRESHOLD = 0.33;

    // Known devices in the simulated environment
    const KNOWN_DEVICES = [
        { id: 'DEV_001', type: 'LoRa Sensor',   freq: 433.92, bandwidth: 0.125, power: 0.6 },
        { id: 'DEV_002', type: 'Zigbee Relay',   freq: 433.50, bandwidth: 0.08,  power: 0.4 },
        { id: 'DEV_003', type: 'Weather Station', freq: 433.85, bandwidth: 0.05,  power: 0.35 },
        { id: 'DEV_004', type: 'LoRa Gateway',   freq: 433.30, bandwidth: 0.15,  power: 0.7 },
    ];

    // Rogue device profiles for anomaly injection
    const ROGUE_PROFILES = [
        { type: 'Unknown Transmitter', freq: 433.92, bandwidth: 0.2,  power: 0.95, description: 'Broadband interference near center freq' },
        { type: 'Spoofed LoRa',       freq: 433.91, bandwidth: 0.13, power: 0.85, description: 'Frequency-shifted LoRa mimic' },
        { type: 'Rogue Sensor',       freq: 433.70, bandwidth: 0.06, power: 0.75, description: 'Unauthorized device in unused band' },
        { type: 'Jammer',             freq: 433.50, bandwidth: 0.5,  power: 0.99, description: 'Wideband jamming signal' },
    ];

    // ── STATE ──
    let scanCount = 12847;
    let anomalyCount = 0;
    let uptimeSeconds = 0;
    let timelineHistory = [];
    let eventLog = [];
    let frameCount = 0;

    // ── UTILITY FUNCTIONS ──
    function gaussian(x, mean, sigma) {
        const exp = -0.5 * Math.pow((x - mean) / sigma, 2);
        return Math.exp(exp);
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function jitter(value, range) {
        return value + (Math.random() - 0.5) * range;
    }

    function formatTime(date) {
        return date.toTimeString().split(' ')[0];
    }

    function formatTimestamp(date) {
        return date.toISOString();
    }

    // ── SPECTROGRAM ROW GENERATOR ──
    function generateSpectrogramRow(injectAnomaly = false, rogueProfile = null) {
        const row = new Float32Array(FREQ_BINS);
        const freqStep = (BAND_END - BAND_START) / FREQ_BINS;

        // 1. Base noise floor
        for (let i = 0; i < FREQ_BINS; i++) {
            row[i] = randomRange(0.02, 0.08);
        }

        // 2. Add known device signals (with natural jitter)
        for (const device of KNOWN_DEVICES) {
            // Devices don't transmit every frame
            if (Math.random() < 0.3) continue;

            const sigma = device.bandwidth / (2 * freqStep);
            const centerBin = Math.floor((device.freq - BAND_START) / freqStep);
            const power = jitter(device.power, 0.15);

            for (let i = 0; i < FREQ_BINS; i++) {
                const contribution = power * gaussian(i, centerBin, sigma);
                row[i] = Math.min(1, row[i] + contribution);
            }
        }

        // 3. Inject anomaly if requested
        if (injectAnomaly && rogueProfile) {
            const sigma = rogueProfile.bandwidth / (2 * freqStep);
            const centerBin = Math.floor((rogueProfile.freq - BAND_START) / freqStep);
            const power = jitter(rogueProfile.power, 0.1);

            for (let i = 0; i < FREQ_BINS; i++) {
                const contribution = power * gaussian(i, centerBin, sigma);
                row[i] = Math.min(1, row[i] + contribution);
            }
        }

        return row;
    }

    // ── GRAD-CAM HEATMAP GENERATOR ──
    function generateGradCAM(anomalyFreq, anomalyBandwidth) {
        const size = 64;
        const heatmap = [];
        const freqStep = (BAND_END - BAND_START) / size;
        const centerBin = Math.floor((anomalyFreq - BAND_START) / freqStep);
        const sigma = anomalyBandwidth / (2 * freqStep);

        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                // Higher activation near the anomaly frequency
                let value = gaussian(x, centerBin, sigma * 1.5);
                // Add some temporal variation
                value *= gaussian(y, size * 0.4, size * 0.3);
                // Add noise
                value += randomRange(0, 0.1);
                row.push(Math.min(1, value));
            }
            heatmap.push(row);
        }
        return heatmap;
    }

    // ── RECONSTRUCTION ERROR SIMULATOR ──
    function computeReconstructionError(spectrogramRow, isAnomaly) {
        if (isAnomaly) {
            // Anomalous: error well above threshold
            return randomRange(THRESHOLD * 1.5, THRESHOLD * 4.0);
        } else {
            // Normal: error below threshold with occasional near-threshold
            if (Math.random() < 0.05) {
                // Near-threshold (interesting for visualization)
                return randomRange(THRESHOLD * 0.7, THRESHOLD * 0.95);
            }
            return randomRange(0.05, THRESHOLD * 0.6);
        }
    }

    // ── EDGE TELEMETRY SIMULATOR ──
    function generateEdgeMetrics() {
        // Simulate realistic RPi Zero 2W metrics
        const baselineCpu = 45;
        const cpuSpike = Math.random() < 0.1 ? randomRange(20, 40) : 0;
        const cpu = Math.min(100, baselineCpu + randomRange(-10, 15) + cpuSpike);

        const baselineRam = 180;
        const ram = Math.min(480, baselineRam + randomRange(-20, 40));

        // Temperature correlates with CPU
        const baselineTemp = 48;
        const temp = baselineTemp + (cpu - baselineCpu) * 0.2 + randomRange(-2, 3);

        return {
            cpu_percent: Math.round(cpu),
            ram_mb: Math.round(ram),
            ram_total_mb: 512,
            temp_celsius: Math.round(temp * 10) / 10,
            mqtt_latency_ms: Math.round(randomRange(15, 45)),
            inference_time_ms: Math.round(randomRange(120, 200)),
            fft_time_ms: Math.round(randomRange(10, 18)),
            spectrogram_gen_ms: Math.round(randomRange(700, 850)),
            wifi_rssi_dbm: Math.round(randomRange(-65, -40)),
            stability_24h: true
        };
    }

    // ── MAIN DATA TICK ──
    function tick() {
        frameCount++;
        scanCount++;
        uptimeSeconds += 2; // Advancing 2 seconds per tick

        // Decide if this tick has an anomaly (roughly 8% chance)
        const isAnomaly = Math.random() < 0.08;
        const rogueProfile = isAnomaly
            ? ROGUE_PROFILES[Math.floor(Math.random() * ROGUE_PROFILES.length)]
            : null;

        if (isAnomaly) anomalyCount++;

        // Generate spectrogram row
        const spectrogramRow = generateSpectrogramRow(isAnomaly, rogueProfile);

        // Compute reconstruction error
        const reconstructionError = computeReconstructionError(spectrogramRow, isAnomaly);
        const anomalyScoreRatio = reconstructionError / THRESHOLD;

        // Confidence: sigmoid-based
        const k = 5;
        const confidence = 1 / (1 + Math.exp(-k * (reconstructionError - THRESHOLD)));

        // Generate edge metrics
        const edgeMetrics = generateEdgeMetrics();

        // Build the data point
        const now = new Date();
        const dataPoint = {
            timestamp: formatTimestamp(now),
            time_display: formatTime(now),
            frequency_mhz: isAnomaly ? rogueProfile.freq : KNOWN_DEVICES[Math.floor(Math.random() * KNOWN_DEVICES.length)].freq,
            reconstruction_error: Math.round(reconstructionError * 1000) / 1000,
            threshold: THRESHOLD,
            is_anomaly: isAnomaly,
            confidence: Math.round(confidence * 100) / 100,
            anomaly_score_ratio: Math.round(anomalyScoreRatio * 100) / 100,
            frequency_bands: isAnomaly ? [
                {
                    start: Math.round((rogueProfile.freq - rogueProfile.bandwidth / 2) * 100) / 100,
                    end: Math.round((rogueProfile.freq + rogueProfile.bandwidth / 2) * 100) / 100,
                    importance: Math.round(randomRange(0.7, 0.95) * 100) / 100
                },
                {
                    start: Math.round((rogueProfile.freq - rogueProfile.bandwidth) * 100) / 100,
                    end: Math.round((rogueProfile.freq - rogueProfile.bandwidth / 2) * 100) / 100,
                    importance: Math.round(randomRange(0.3, 0.65) * 100) / 100
                }
            ] : [],
            device_id: isAnomaly ? `ROGUE_${String(anomalyCount).padStart(3, '0')}` : KNOWN_DEVICES[Math.floor(Math.random() * KNOWN_DEVICES.length)].id,
            device_type: isAnomaly ? rogueProfile.type : KNOWN_DEVICES[Math.floor(Math.random() * KNOWN_DEVICES.length)].type,
            rogue_description: isAnomaly ? rogueProfile.description : null,
            edge_metrics: edgeMetrics,
            spectrogram_row: spectrogramRow,
            gradcam_data: isAnomaly ? generateGradCAM(rogueProfile.freq, rogueProfile.bandwidth) : null,
            scan_number: scanCount
        };

        // Update timeline history (keep last 60 points)
        timelineHistory.push({
            time: now,
            error: reconstructionError,
            isAnomaly: isAnomaly
        });
        if (timelineHistory.length > 60) timelineHistory.shift();

        // Update event log (keep last 50 events)
        eventLog.unshift(dataPoint);
        if (eventLog.length > 50) eventLog.pop();

        return dataPoint;
    }

    // ── INITIAL HISTORY (pre-fill timeline with 30 points) ──
    function generateInitialHistory() {
        for (let i = 0; i < 30; i++) {
            const error = randomRange(0.05, THRESHOLD * 0.6);
            timelineHistory.push({
                time: new Date(Date.now() - (30 - i) * 2000),
                error: error,
                isAnomaly: false
            });
        }
    }

    // ── PRE-FILL EVENT LOG WITH 10 INITIAL ENTRIES ──
    function generateInitialEvents() {
        const deviceCycle = [...KNOWN_DEVICES];
        for (let i = 9; i >= 0; i--) {
            const device = deviceCycle[i % deviceCycle.length];
            const isAnomaly = i === 3; // One historical anomaly
            const error = isAnomaly ? randomRange(0.5, 0.8) : randomRange(0.05, 0.25);
            const rogue = isAnomaly ? ROGUE_PROFILES[0] : null;

            const entry = {
                timestamp: new Date(Date.now() - i * 30000).toISOString(),
                time_display: formatTime(new Date(Date.now() - i * 30000)),
                frequency_mhz: isAnomaly ? rogue.freq : device.freq,
                reconstruction_error: Math.round(error * 1000) / 1000,
                threshold: THRESHOLD,
                is_anomaly: isAnomaly,
                anomaly_score_ratio: Math.round((error / THRESHOLD) * 100) / 100,
                device_id: isAnomaly ? 'ROGUE_001' : device.id,
                device_type: isAnomaly ? rogue.type : device.type,
                scan_number: scanCount - (10 - i) * 15
            };
            eventLog.unshift(entry);
            if (isAnomaly) anomalyCount++;
        }
    }

    // ── PUBLIC API ──
    return {
        tick,
        generateInitialHistory,
        generateInitialEvents,
        generateSpectrogramRow,
        getTimelineHistory: () => timelineHistory,
        getEventLog: () => eventLog,
        getScanCount: () => scanCount,
        getAnomalyCount: () => anomalyCount,
        getUptimeSeconds: () => uptimeSeconds,
        getThreshold: () => THRESHOLD,
        FREQ_BINS,
        BAND_START,
        BAND_END,
        CENTER_FREQ
    };
})();
