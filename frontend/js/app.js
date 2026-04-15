/* ═══════════════════════════════════════════════════════════════
   MAIN APPLICATION ORCHESTRATOR
   Ties together mock data, waterfall, charts, and DOM updates.
   Runs the main simulation loop at 2-second intervals.
   ═══════════════════════════════════════════════════════════════ */

(() => {
    'use strict';

    // ── STATE ──
    let isRunning = false;
    let tickInterval = null;
    let clockInterval = null;
    let waterfallSubInterval = null;
    let startTime = Date.now();
    let lastAnomalyData = null;

    // ── INITIALIZATION ──
    function init() {
        console.log('[RF-SAH] Initializing dashboard...');

        // Initialize sub-modules
        Waterfall.init('waterfall-canvas');
        Charts.Timeline.init('timeline-canvas');
        Charts.GradCAM.init('gradcam-canvas');
        Charts.GradCAM.clear();

        // Generate initial history data
        MockData.generateInitialHistory();
        MockData.generateInitialEvents();

        // Render initial state
        renderEventLog();
        updateKPIs();
        Charts.Timeline.draw(MockData.getTimelineHistory(), MockData.getThreshold());

        // Start clock
        clockInterval = setInterval(updateClock, 1000);
        updateClock();

        // Start main data loop (every 2 seconds)
        tickInterval = setInterval(mainTick, 2000);

        // Start waterfall sub-ticks (fill in between main ticks for smoother scrolling)
        waterfallSubInterval = setInterval(waterfallSubTick, 400);

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Mark as running
        isRunning = true;
        console.log('[RF-SAH] Dashboard live. Monitoring 433 MHz ISM band.');
    }

    // ── MAIN TICK (every 2s) ──
    function mainTick() {
        const data = MockData.tick();

        // 1. Update waterfall with new spectrogram row
        Waterfall.addRow(data.spectrogram_row, data.is_anomaly);

        // 2. Update timeline chart
        Charts.Timeline.draw(MockData.getTimelineHistory(), MockData.getThreshold());

        // 3. Update FPS counter
        document.getElementById('waterfall-fps').textContent = `${Waterfall.getFps()} FPS`;

        // 4. Update KPI cards
        updateKPIs();

        // 5. Update event log
        renderEventLog();

        // 6. Update edge telemetry
        updateEdgeTelemetry(data.edge_metrics);

        // 7. Handle anomaly alert
        if (data.is_anomaly) {
            triggerAlert(data);
        }

        // 8. Update latency KPI
        const totalLatency = data.edge_metrics.fft_time_ms +
                           data.edge_metrics.spectrogram_gen_ms +
                           data.edge_metrics.mqtt_latency_ms +
                           data.edge_metrics.inference_time_ms;
        document.getElementById('kpi-latency-value').textContent = `${totalLatency}ms`;
    }

    // ── WATERFALL SUB-TICK (fill intermediate rows for smooth scrolling) ──
    function waterfallSubTick() {
        // Generate a normal-only spectrogram row for smooth scrolling effect
        const row = MockData.generateSpectrogramRow(false, null);
        Waterfall.addRow(row, false);
    }

    // ── CLOCK UPDATE ──
    function updateClock() {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        document.getElementById('clock').textContent = timeStr;

        // Update uptime in footer
        const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
        const h = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
        const s = String(uptimeSec % 60).padStart(2, '0');
        document.getElementById('footer-uptime').textContent = `UPTIME: ${h}:${m}:${s}`;
    }

    // ── KPI UPDATES ──
    function updateKPIs() {
        // Scan count with animation
        const scanEl = document.getElementById('kpi-scans-value');
        animateNumber(scanEl, MockData.getScanCount());

        // Anomaly count
        const anomalyEl = document.getElementById('kpi-anomalies-value');
        const anomalyCount = MockData.getAnomalyCount();
        anomalyEl.textContent = anomalyCount;

        // Update anomaly card styling
        const anomalyCard = document.getElementById('kpi-anomalies');
        if (anomalyCount > 0) {
            anomalyEl.classList.add('kpi-card__value--alert');
        }

        // Scan rate
        const elapsed = (Date.now() - startTime) / 60000; // minutes
        const rate = Math.round(MockData.getScanCount() / Math.max(1, elapsed));
        document.getElementById('kpi-scans-rate').textContent = `+${rate}/min`;
    }

    function animateNumber(element, target) {
        const current = parseInt(element.textContent.replace(/,/g, '')) || 0;
        if (current === target) return;

        const formatted = target.toLocaleString();
        element.textContent = formatted;
    }

    // ── EVENT LOG ──
    function renderEventLog() {
        const tbody = document.getElementById('event-table-body');
        const events = MockData.getEventLog();

        // Only update if we have new data
        const rows = events.slice(0, 20).map((event, index) => {
            const statusClass = event.is_anomaly ? 'event-row--anomaly' : '';
            const newClass = index === 0 ? 'event-row--new' : '';
            const statusBadge = event.is_anomaly
                ? '<span class="status-badge status-badge--anomaly">🔴 ANOMALY</span>'
                : '<span class="status-badge status-badge--normal">🟢 NORMAL</span>';

            const ratio = event.anomaly_score_ratio;
            const ratioColorStyle = ratio > 2 ? 'color: var(--red);' :
                                    ratio > 0.8 ? 'color: var(--amber);' : '';

            return `<tr class="${statusClass} ${newClass}">
                <td>${event.time_display}</td>
                <td style="font-family: var(--font-mono)">${event.frequency_mhz.toFixed(2)}</td>
                <td style="font-family: var(--font-mono)">${event.reconstruction_error.toFixed(3)}</td>
                <td style="font-family: var(--font-mono); ${ratioColorStyle}">${ratio.toFixed(2)}×</td>
                <td>${event.device_id}</td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');

        tbody.innerHTML = rows;

        // Update event count
        document.getElementById('event-count').textContent = `${events.length} events`;
    }

    // ── ALERT HANDLING ──
    function triggerAlert(data) {
        lastAnomalyData = data;

        const alertPanel = document.getElementById('panel-alert');
        const alertIdle = document.getElementById('alert-idle');
        const alertActive = document.getElementById('alert-active');
        const alertBadge = document.getElementById('alert-status-badge');

        // Switch to active state
        alertPanel.classList.add('panel--alert-active');
        alertIdle.style.display = 'none';
        alertActive.style.display = 'block';

        // Update badge
        alertBadge.textContent = 'ANOMALY';
        alertBadge.className = 'panel__badge panel__badge--alert';

        // Fill in details
        document.getElementById('alert-time').textContent = data.time_display;
        document.getElementById('alert-freq').textContent = `${data.frequency_mhz.toFixed(2)} MHz`;
        document.getElementById('alert-score').textContent = `${data.anomaly_score_ratio.toFixed(2)}× threshold`;
        document.getElementById('alert-device').textContent = `${data.device_id} (${data.device_type})`;

        // Confidence bar
        const confidencePercent = Math.round(data.confidence * 100);
        document.getElementById('alert-confidence-fill').style.width = `${confidencePercent}%`;
        document.getElementById('alert-confidence-text').textContent = `${confidencePercent}%`;

        // Frequency bands
        const bandsList = document.getElementById('alert-bands-list');
        bandsList.innerHTML = data.frequency_bands.map(band =>
            `<div class="alert-band-item">
                <span class="alert-band-item__freq">${band.start.toFixed(2)} — ${band.end.toFixed(2)} MHz</span>
                <span class="alert-band-item__importance">IMP: ${band.importance.toFixed(2)}</span>
            </div>`
        ).join('');

        // Render Grad-CAM
        if (data.gradcam_data) {
            Charts.GradCAM.draw(data.gradcam_data);
        }

        // Flash the KPI anomaly card
        const anomalyCard = document.getElementById('kpi-anomalies');
        anomalyCard.style.borderColor = 'var(--red)';
        anomalyCard.style.boxShadow = '0 0 20px var(--red-dim)';
        setTimeout(() => {
            anomalyCard.style.borderColor = '';
            anomalyCard.style.boxShadow = '';
        }, 3000);
    }

    // ── EDGE TELEMETRY ──
    function updateEdgeTelemetry(metrics) {
        // CPU
        document.getElementById('health-cpu').textContent = `${metrics.cpu_percent}%`;
        const cpuBar = document.getElementById('health-cpu-bar');
        cpuBar.style.width = `${metrics.cpu_percent}%`;
        cpuBar.className = 'health-bar__fill' +
            (metrics.cpu_percent > 85 ? ' health-bar__fill--danger' :
             metrics.cpu_percent > 70 ? ' health-bar__fill--warning' : '');

        // RAM
        document.getElementById('health-ram').textContent = `${metrics.ram_mb} / ${metrics.ram_total_mb} MB`;
        const ramPercent = (metrics.ram_mb / metrics.ram_total_mb) * 100;
        const ramBar = document.getElementById('health-ram-bar');
        ramBar.style.width = `${ramPercent}%`;
        ramBar.className = 'health-bar__fill' +
            (ramPercent > 90 ? ' health-bar__fill--danger' :
             ramPercent > 75 ? ' health-bar__fill--warning' : '');

        // Temperature
        document.getElementById('health-temp').textContent = `${metrics.temp_celsius}°C`;
        const tempPercent = Math.min(100, (metrics.temp_celsius / 85) * 100); // 85°C = throttle point
        const tempBar = document.getElementById('health-temp-bar');
        tempBar.style.width = `${tempPercent}%`;
        if (metrics.temp_celsius > 75) {
            tempBar.className = 'health-bar__fill health-bar__fill--danger';
        } else if (metrics.temp_celsius > 65) {
            tempBar.className = 'health-bar__fill health-bar__fill--warning';
        } else {
            tempBar.className = 'health-bar__fill health-bar__fill--temp';
        }

        // MQTT Latency
        document.getElementById('health-mqtt-latency').textContent = `${metrics.mqtt_latency_ms} ms`;

        // Inference time
        document.getElementById('health-inference-time').textContent = `${metrics.inference_time_ms} ms`;

        // FFT & Spectrogram
        document.getElementById('health-fft').textContent = `${metrics.fft_time_ms} ms`;
        document.getElementById('health-specgen').textContent = `${metrics.spectrogram_gen_ms} ms`;

        // Last retrain (simulated)
        document.getElementById('health-retrain').textContent = '2h ago';
    }

    // ── GLOBAL ACTION HANDLERS ──
    window.dismissAlert = function() {
        const alertPanel = document.getElementById('panel-alert');
        const alertIdle = document.getElementById('alert-idle');
        const alertActive = document.getElementById('alert-active');
        const alertBadge = document.getElementById('alert-status-badge');

        alertPanel.classList.remove('panel--alert-active');
        alertActive.style.display = 'none';
        alertIdle.style.display = 'flex';
        alertBadge.textContent = 'MONITORING';
        alertBadge.className = 'panel__badge panel__badge--idle';

        Charts.GradCAM.clear();
        console.log('[RF-SAH] Alert dismissed.');
    };

    window.exportForensics = function() {
        if (!lastAnomalyData) return;

        const blob = new Blob(
            [JSON.stringify(lastAnomalyData, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anomaly_${lastAnomalyData.device_id}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[RF-SAH] Forensics exported.');
    };

    window.markFalsePositive = function() {
        if (!lastAnomalyData) return;
        console.log(`[RF-SAH] Marked ${lastAnomalyData.device_id} as false positive. Would retrain model.`);

        // Visual feedback
        const btn = document.getElementById('btn-fp');
        btn.textContent = 'MARKED ✓';
        btn.style.borderColor = 'var(--green)';
        btn.style.color = 'var(--green)';
        setTimeout(() => {
            btn.textContent = 'FALSE +';
            btn.style.borderColor = '';
            btn.style.color = '';
            window.dismissAlert();
        }, 2000);
    };

    // ── RESIZE HANDLER ──
    function handleResize() {
        Waterfall.resize();
        Charts.Timeline.resize();
        Charts.Timeline.draw(MockData.getTimelineHistory(), MockData.getThreshold());
    }

    // ── BOOT ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
