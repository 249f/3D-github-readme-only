// Test SVG generation with mock data (no network needed)
const fs = require('fs');

// Import just the parts we need by re-requiring the module internals
// We'll replicate the logic manually since the module only exports handler

const LEVEL_COLORS = {
    0: { top: '#161b22', left: '#0d1117', right: '#10151c' },
    1: { top: '#0e4429', left: '#0a3520', right: '#0b3a23' },
    2: { top: '#006d32', left: '#005526', right: '#005e2b' },
    3: { top: '#26a641', left: '#1e8535', right: '#21923a' },
    4: { top: '#39d353', left: '#2db344', right: '#30c049' },
};

const BG_COLOR = '#0a0e17';
const TEXT_COLOR = '#8b949e';
const ACCENT_COLOR = '#39d353';
const CELL_W = 10;
const GAP = 2;
const BASE_HEIGHT = 2;
const MAX_HEIGHT = 28;
const ISO_ANGLE = Math.PI / 6;

function isoProject(x, y, z) {
    return {
        x: (x - y) * Math.cos(ISO_ANGLE),
        y: (x + y) * Math.sin(ISO_ANGLE) - z
    };
}

function f(n) { return Math.round(n * 100) / 100; }
function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Generate 365 days of mock data
const data = [];
const startDate = new Date('2024-02-12');
for (let i = 0; i < 365; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const level = Math.floor(Math.random() * 5);
    const count = [0, 1, 4, 8, 16][level];
    data.push({ date: dateStr, count, level });
}

// Group by weeks
function groupByWeeks(data) {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const weeks = [];
    let currentWeek = [];
    const firstDate = new Date(sorted[0].date + 'T00:00:00Z');
    const firstDay = firstDate.getUTCDay();
    for (let i = 0; i < firstDay; i++) currentWeek.push(null);
    for (const d of sorted) {
        currentWeek.push(d);
        if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }
    return weeks;
}

// Generate SVG
const weeks = groupByWeeks(data);
const numWeeks = weeks.length;
const maxCount = Math.max(...data.map(d => d.count), 1);
const total = data.reduce((s, d) => s + d.count, 0);
const step = CELL_W + GAP;

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
        const entry = weeks[w][d];
        if (!entry) continue;
        const height = entry.level === 0 ? BASE_HEIGHT : BASE_HEIGHT + (entry.count / maxCount) * MAX_HEIGHT;
        const x = w * step;
        const y = d * step;
        const corners = [
            isoProject(x, y, 0), isoProject(x + CELL_W, y, 0),
            isoProject(x, y + CELL_W, 0), isoProject(x + CELL_W, y + CELL_W, 0),
            isoProject(x, y, height), isoProject(x + CELL_W, y, height),
            isoProject(x, y + CELL_W, height), isoProject(x + CELL_W, y + CELL_W, height),
        ];
        for (const c of corners) {
            if (c.x < minX) minX = c.x;
            if (c.x > maxX) maxX = c.x;
            if (c.y < minY) minY = c.y;
            if (c.y > maxY) maxY = c.y;
        }
    }
}

const padding = 50;
const titleHeight = 45;
const legendHeight = 40;
const svgWidth = (maxX - minX) + padding * 2;
const svgHeight = (maxY - minY) + padding * 2 + titleHeight + legendHeight;
const offsetX = -minX + padding;
const offsetY = -minY + padding + titleHeight;

let paths = '';
for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
        const entry = weeks[w][d];
        if (!entry) continue;
        const colors = LEVEL_COLORS[entry.level];
        const height = entry.level === 0 ? BASE_HEIGHT : BASE_HEIGHT + (entry.count / maxCount) * MAX_HEIGHT;
        const x = w * step;
        const y = d * step;
        const p = {
            b_fl: isoProject(x, y + CELL_W, 0),
            b_fr: isoProject(x + CELL_W, y + CELL_W, 0),
            b_bl: isoProject(x, y, 0),
            b_br: isoProject(x + CELL_W, y, 0),
            t_fl: isoProject(x, y + CELL_W, height),
            t_fr: isoProject(x + CELL_W, y + CELL_W, height),
            t_bl: isoProject(x, y, height),
            t_br: isoProject(x + CELL_W, y, height),
        };
        for (const key of Object.keys(p)) {
            p[key].x += offsetX;
            p[key].y += offsetY;
        }
        paths += `<path d="M${f(p.b_fl.x)},${f(p.b_fl.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} L${f(p.t_bl.x)},${f(p.t_bl.y)} L${f(p.b_bl.x)},${f(p.b_bl.y)} Z" fill="${colors.left}"/>`;
        paths += `<path d="M${f(p.b_fl.x)},${f(p.b_fl.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} L${f(p.t_fr.x)},${f(p.t_fr.y)} L${f(p.b_fr.x)},${f(p.b_fr.y)} Z" fill="${colors.right}"/>`;
        paths += `<path d="M${f(p.t_bl.x)},${f(p.t_bl.y)} L${f(p.t_br.x)},${f(p.t_br.y)} L${f(p.t_fr.x)},${f(p.t_fr.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} Z" fill="${colors.top}"/>`;
    }
}

const username = 'testuser';
const legendY = svgHeight - legendHeight + 10;
const legendX = svgWidth / 2 - 80;
let legend = `<text x="${legendX}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, sans-serif">Less</text>`;
[0, 1, 2, 3, 4].forEach((lvl, i) => {
    legend += `<rect x="${legendX + 32 + i * 16}" y="${legendY}" width="12" height="12" rx="2" fill="${LEVEL_COLORS[lvl].top}"/>`;
});
legend += `<text x="${legendX + 32 + 5 * 16}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, sans-serif">More</text>`;

const title = `<text x="${padding}" y="28" fill="${ACCENT_COLOR}" font-size="16" font-weight="700" font-family="Inter, sans-serif">@${username}</text>`;
const stats = `<text x="${svgWidth - padding}" y="28" fill="${TEXT_COLOR}" font-size="13" font-family="Inter, sans-serif" text-anchor="end">${total} contributions in the last year</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(svgWidth)}" height="${Math.ceil(svgHeight)}" viewBox="0 0 ${Math.ceil(svgWidth)} ${Math.ceil(svgHeight)}">
  <rect width="100%" height="100%" fill="${BG_COLOR}" rx="12"/>
  ${title}
  ${stats}
  ${paths}
  ${legend}
</svg>`;

fs.writeFileSync('test-output.svg', svg);
const pathCount = (svg.match(/<path/g) || []).length;
console.log('SVG generated successfully!');
console.log('SVG size:', svg.length, 'bytes');
console.log('Dimensions:', Math.ceil(svgWidth) + 'x' + Math.ceil(svgHeight));
console.log('Path elements:', pathCount);
console.log('Total contributions:', total);
console.log('Weeks:', numWeeks);
console.log('Saved to test-output.svg');
