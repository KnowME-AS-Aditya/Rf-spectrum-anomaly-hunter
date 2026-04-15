/* ═══════════════════════════════════════════════════════════════
   SPECTRUM WATERFALL RENDERER
   Canvas-based scrolling waterfall display for RF spectrum.
   Each row = one time frame. Scrolls downward.
   Color: Black (noise) → Green (normal) → Amber → Red (anomaly)
   ═══════════════════════════════════════════════════════════════ */

const Waterfall = (() => {
    let canvas, ctx;
    let width, height;
    let rowHeight = 3; // pixels per time row
    let imageData;
    let frameCounter = 0;
    let fpsCounter = 0;
    let lastFpsTime = 0;
    let currentFps = 0;

    // Color lookup table (pre-computed for performance)
    const COLOR_LUT = new Uint8Array(256 * 3);

    function buildColorLUT() {
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;

            if (t < 0.15) {
                // Black → Dark green (noise floor)
                const s = t / 0.15;
                r = 0;
                g = Math.floor(s * 30);
                b = 0;
            } else if (t < 0.4) {
                // Dark green → Bright green (normal signals)
                const s = (t - 0.15) / 0.25;
                r = 0;
                g = Math.floor(30 + s * 225);
                b = Math.floor(s * 20);
            } else if (t < 0.65) {
                // Green → Amber (strong signals)
                const s = (t - 0.4) / 0.25;
                r = Math.floor(s * 255);
                g = Math.floor(255 - s * 75);
                b = Math.floor(20 - s * 20);
            } else if (t < 0.85) {
                // Amber → Red-orange (very strong)
                const s = (t - 0.65) / 0.2;
                r = 255;
                g = Math.floor(180 - s * 150);
                b = 0;
            } else {
                // Red (anomaly territory)
                const s = (t - 0.85) / 0.15;
                r = 255;
                g = Math.floor(30 - s * 30);
                b = Math.floor(s * 60);
            }

            COLOR_LUT[i * 3] = r;
            COLOR_LUT[i * 3 + 1] = g;
            COLOR_LUT[i * 3 + 2] = b;
        }
    }

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Set actual pixel dimensions
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
        canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);

        width = canvas.width;
        height = canvas.height;

        // Build color lookup
        buildColorLUT();

        // Initialize with black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Store current image data
        imageData = ctx.getImageData(0, 0, width, height);

        lastFpsTime = performance.now();
    }

    function addRow(spectrogramRow, isAnomaly = false) {
        if (!ctx || !imageData) return;

        frameCounter++;
        fpsCounter++;

        // Calculate FPS every second
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            currentFps = fpsCounter;
            fpsCounter = 0;
            lastFpsTime = now;
        }

        const data = imageData.data;
        const rowPixels = rowHeight;

        // Shift existing rows down by rowHeight pixels
        // Copy from bottom to top to avoid overwriting
        for (let y = height - 1; y >= rowPixels; y--) {
            const destOffset = y * width * 4;
            const srcOffset = (y - rowPixels) * width * 4;
            for (let x = 0; x < width * 4; x++) {
                data[destOffset + x] = data[srcOffset + x];
            }
        }

        // Draw new row at top
        const binsPerPixel = spectrogramRow.length / width;

        for (let x = 0; x < width; x++) {
            // Map pixel to frequency bin
            const binIndex = Math.min(
                spectrogramRow.length - 1,
                Math.floor(x * binsPerPixel)
            );

            // Get power value and map to color
            let power = spectrogramRow[binIndex];

            // Clamp to [0, 1]
            power = Math.max(0, Math.min(1, power));

            // Map to LUT index
            const lutIndex = Math.floor(power * 255);
            const r = COLOR_LUT[lutIndex * 3];
            const g = COLOR_LUT[lutIndex * 3 + 1];
            const b = COLOR_LUT[lutIndex * 3 + 2];

            // If anomaly row, boost red channel and add glow effect
            let finalR = r, finalG = g, finalB = b;
            if (isAnomaly) {
                finalR = Math.min(255, r + 40);
                finalG = Math.max(0, g - 20);
                // Add subtle red tint to entire row
                finalR = Math.min(255, finalR + 15);
            }

            // Write pixels for each row height
            for (let dy = 0; dy < rowPixels; dy++) {
                const offset = (dy * width + x) * 4;
                data[offset] = finalR;
                data[offset + 1] = finalG;
                data[offset + 2] = finalB;
                data[offset + 3] = 255;
            }
        }

        // Put updated image data back
        ctx.putImageData(imageData, 0, 0);

        // Draw anomaly marker line
        if (isAnomaly) {
            ctx.strokeStyle = 'rgba(255, 7, 58, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, rowPixels);
            ctx.lineTo(width, rowPixels);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function getFps() {
        return currentFps;
    }

    function resize() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
        canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);
        width = canvas.width;
        height = canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        imageData = ctx.getImageData(0, 0, width, height);
    }

    return {
        init,
        addRow,
        getFps,
        resize
    };
})();
