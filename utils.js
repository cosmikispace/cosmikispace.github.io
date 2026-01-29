// Utility helpers (formatting, validation, common reusable functions, etc.).
// TODO: extract reusable functions from the large file into this module.

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Load image and return it as base64 data URL
async function loadImage(url) {
    return await fetch(url)
        .then((response) => response.blob())
        .then(
            (blob) =>
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                })
        );
}

// Help to compress images before pasting them into pdf file
async function compressImage(base64, quality = 0.6, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");

            // Set background before drawing the image
            ctx.fillStyle = "#F5E9E3";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
            resolve(compressedBase64);
        };
    });
}

// Return ISO date (yyyy-mm-dd) from Date or date-like input
function isoDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

// Format date as dd-mm-yyyy
function formatDateDMY(dateInput) {
    if (!dateInput) return "";

    const d = new Date(dateInput);
    if (isNaN(d)) return "";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
}

// Zero-pad number to 2 digits
function pad2(n) {
    return String(n).padStart(2, "0");
}

// Format ISO date string as dd.mm.yyyy (uk-short)
function formatUkDateShort(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
}

// Convert hex color to RGB object
function hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

// Blend RGBA color over hex background
function blendOverBg({r, g, b, a}, bgHex) {
    const bg = hexToRgb(bgHex);
    const aa = Math.max(0, Math.min(1, Number(a ?? 1)));
    return {
        r: Math.round(aa * r + (1 - aa) * bg.r),
        g: Math.round(aa * g + (1 - aa) * bg.g),
        b: Math.round(aa * b + (1 - aa) * bg.b),
    };
}

// Parse rgba() or rgb() string into object
function parseRgba(str) {
    const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
    if (!m) return null;
    return {r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4]};
}

// Try to fit text into max width by shrinking font size and ellipsizing if needed
function fitText(doc, text, maxW, fontName, maxSize = 10, minSize = 8) {
    doc.setFont(fontName);
    let size = maxSize;
    doc.setFontSize(size);

    const clean = String(text ?? "").trim();
    if (!clean) return {text: "", size};

    while (size > minSize && doc.getTextWidth(clean) > maxW) {
        size -= 0.5;
        doc.setFontSize(size);
    }

    if (doc.getTextWidth(clean) <= maxW) return {text: clean, size};

    // still too long -> ellipsis
    let t = clean;
    while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) {
        t = t.slice(0, -1);
    }
    return {text: t + "…", size};
}

// Format month name as short Ukrainian label like "груд.", "січ.", ...
function formatMonthShortUk(date) {
    // "груд.", "січ.", "лют." ...
    return date.toLocaleDateString("uk-UA", {month: "short"}).toLowerCase();
}

// Expose helpers to the global scope for existing HTML/JS to use
window.arrayBufferToBase64 = arrayBufferToBase64;
window.loadImage = loadImage;
window.compressImage = compressImage;
window.isoDate = isoDate;
window.formatDateDMY = formatDateDMY;
window.pad2 = pad2;
window.formatUkDateShort = formatUkDateShort;
window.hexToRgb = hexToRgb;
window.blendOverBg = blendOverBg;
window.parseRgba = parseRgba;
window.fitText = fitText;
window.formatMonthShortUk = formatMonthShortUk;

