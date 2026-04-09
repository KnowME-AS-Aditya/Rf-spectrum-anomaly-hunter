/* ═══════════════════════════════════════════════════════════════
   CHART RENDERERS
   Canvas-based charts for anomaly score timeline and Grad-CAM.
   No external libraries — pure Canvas2D.
   ═══════════════════════════════════════════════════════════════ */

const Charts = (() => {

    // ── ANOMALY SCORE TIMELINE ──
    const Timeline = (() => {
        let canvas, ctx;
        let width, height;
        const padding = { top: 20, right: 30, bottom: 35, left: 55 };

        function init(canvasId) {
            canvas = document.getElementById(canvasId);
            ctx = canvas.getContext('2d');

            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
            canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);

            width = canvas.width;
            height = canvas.height;
        }

        function draw(data, threshold) {
            if (!ctx || data.length === 0) return;

            ctx.clearRect(0, 0, width, height);

            const plotW = width - padding.left - padding.right;
            const plotH = height - padding.top - padding.bottom;

            // Find max error for Y scale
            const maxError = Math.max(threshold * 3, ...data.map(d => d.error)) * 1.15;

            // ── Draw grid ──
            ctx.strokeStyle = '#1C1C1C';
            ctx.lineWidth = 1;

            // Horizontal grid lines
            const yTicks = 5;
            for (let i = 0; i <= yTicks; i++) {
                const y = padding.top + (plotH / yTicks) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();

                // Y-axis labels
                const val = maxError * (1 - i / yTicks);
                ctx.fillStyle = '#444';
                ctx.font = '10px "IBM Plex Mono", monospace';
                ctx.textAlign = 'right';
                ctx.fillText(val.toFixed(2), padding.left - 8, y + 4);
            }

            // Y-axis label
            ctx.save();
            ctx.translate(12, padding.top + plotH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = '#444';
            ctx.font = '9px "IBM Plex Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('MSE', 0, 0);
            ctx.restore();

            // X-axis time labels
            const xLabelCount = Math.min(8, data.length);
            const step = Math.max(1, Math.floor(data.length / xLabelCount));
            for (let i = 0; i < data.length; i += step) {
                const x = padding.left + (i / (data.length - 1 || 1)) * plotW;
                const time = data[i].time;
                const label = time.toTimeString().substr(0, 8);
                ctx.fillStyle = '#444';
                ctx.font = '9px "IBM Plex Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, x, height - 8);
            }

            // ── Draw threshold line ──
            const thresholdY = padding.top + plotH * (1 - threshold / maxError);
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, thresholdY);
            ctx.lineTo(width - padding.right, thresholdY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Threshold label
            ctx.fillStyle = '#FFB300';
            ctx.font = 'bold 9px "IBM Plex Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`μ+3σ = ${threshold}`, width - padding.right + 4, thresholdY + 3);

            // ── Fill area under curve ──
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top + plotH);

            for (let i = 0; i < data.length; i++) {
                const x = padding.left + (i / (data.length - 1 || 1)) * plotW;
                const y = padding.top + plotH * (1 - data[i].error / maxError);
                if (i === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.lineTo(padding.left + plotW, padding.top + plotH);
            ctx.closePath();

            // Gradient fill
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
            gradient.addColorStop(0, 'rgba(0, 255, 65, 0.15)');
            gradient.addColorStop(1, 'rgba(0, 255, 65, 0.02)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // ── Draw line ──
            ctx.beginPath();
            for (let i = 0; i < data.length; i++) {
                const x = padding.left + (i / (data.length - 1 || 1)) * plotW;
                const y = padding.top + plotH * (1 - data[i].error / maxError);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    // Smooth line using quadratic curve
                    const prevX = padding.left + ((i - 1) / (data.length - 1 || 1)) * plotW;
                    const prevY = padding.top + plotH * (1 - data[i - 1].error / maxError);
                    const cpX = (prevX + x) / 2;
                    ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
                }
            }
            // Finish the last segment
            if (data.length > 1) {
                const lastX = padding.left + plotW;
                const lastY = padding.top + plotH * (1 - data[data.length - 1].error / maxError);
                ctx.lineTo(lastX, lastY);
            }

            ctx.strokeStyle = '#00FF41';
            ctx.lineWidth = 2;
            ctx.stroke();

            // ── Draw data points ──
            for (let i = 0; i < data.length; i++) {
                const x = padding.left + (i / (data.length - 1 || 1)) * plotW;
                const y = padding.top + plotH * (1 - data[i].error / maxError);
                const isAnomaly = data[i].isAnomaly;

                if (isAnomaly) {
                    // Anomaly: large red dot with glow
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 7, 58, 0.3)';
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#FF073A';
                    ctx.fill();
                    ctx.strokeStyle = '#FF073A';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Vertical marker line
                    ctx.strokeStyle = 'rgba(255, 7, 58, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 3]);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, padding.top + plotH);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else if (i === data.length - 1) {
                    // Latest point: green with glow
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#00FF41';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // ── Draw anomaly zone highlight ──
            if (thresholdY > padding.top) {
                const zoneGradient = ctx.createLinearGradient(0, padding.top, 0, thresholdY);
                zoneGradient.addColorStop(0, 'rgba(255, 7, 58, 0.08)');
                zoneGradient.addColorStop(1, 'rgba(255, 7, 58, 0.02)');
                ctx.fillStyle = zoneGradient;
                ctx.fillRect(padding.left, padding.top, plotW, thresholdY - padding.top);
            }
        }

        function resize() {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
            canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);
            width = canvas.width;
            height = canvas.height;
        }

        return { init, draw, resize };
    })();


    // ── GRAD-CAM HEATMAP RENDERER ──
    const GradCAM = (() => {
        let canvas, ctx;

        function init(canvasId) {
            canvas = document.getElementById(canvasId);
            ctx = canvas.getContext('2d');
        }

        function draw(heatmapData) {
            if (!ctx || !heatmapData) return;

            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
            canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);

            const w = canvas.width;
            const h = canvas.height;
            const rows = heatmapData.length;
            const cols = heatmapData[0].length;

            const cellW = w / cols;
            const cellH = h / rows;

            const imageData = ctx.createImageData(w, h);
            const data = imageData.data;

            for (let py = 0; py < h; py++) {
                const row = Math.min(rows - 1, Math.floor(py / cellH));
                for (let px = 0; px < w; px++) {
                    const col = Math.min(cols - 1, Math.floor(px / cellW));
                    const value = heatmapData[row][col];

                    // Jet-like colormap (blue → cyan → green → yellow → red)
                    let r, g, b;
                    if (value < 0.25) {
                        const t = value / 0.25;
                        r = 0;
                        g = 0;
                        b = Math.floor(128 + t * 127);
                    } else if (value < 0.5) {
                        const t = (value - 0.25) / 0.25;
                        r = 0;
                        g = Math.floor(t * 255);
                        b = Math.floor(255 - t * 128);
                    } else if (value < 0.75) {
                        const t = (value - 0.5) / 0.25;
                        r = Math.floor(t * 255);
                        g = 255;
                        b = 0;
                    } else {
                        const t = (value - 0.75) / 0.25;
                        r = 255;
                        g = Math.floor(255 - t * 255);
                        b = 0;
                    }

                    const offset = (py * w + px) * 4;
                    data[offset] = r;
                    data[offset + 1] = g;
                    data[offset + 2] = b;
                    data[offset + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // Add frequency axis labels
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '9px "IBM Plex Mono", monospace';
            ctx.fillText('433.0', 4, h - 4);
            ctx.textAlign = 'right';
            ctx.fillText('434.0 MHz', w - 4, h - 4);
            ctx.textAlign = 'center';
            ctx.fillText('FREQ →', w / 2, h - 4);

            // Label
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText('TIME ↓', 4, 12);
        }

        function clear() {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Show "No data" text
            ctx.fillStyle = '#333';
            ctx.font = '11px "IBM Plex Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('NO HEATMAP DATA', canvas.width / 2, canvas.height / 2);
        }

        return { init, draw, clear };
    })();


    return { Timeline, GradCAM };
})();
