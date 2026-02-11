// Vercel Serverless Function: Generate 3D Isometric GitHub Contribution SVG
// Usage: /api/generate?user=USERNAME

const https = require('https');

// ===== CONFIG =====
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

// Isometric cell dimensions
const CELL_W = 10;
const CELL_H = 10;
const GAP = 2;
const BASE_HEIGHT = 2;
const MAX_HEIGHT = 28;

// Isometric projection angles
const ISO_ANGLE = Math.PI / 6; // 30 degrees

// ===== MAIN HANDLER =====
module.exports = async function handler(req, res) {
  const username = req.query.user || req.query.username;

  if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(400).send(generateErrorSVG('Invalid or missing username. Use ?user=USERNAME'));
  }

  try {
    const html = await fetchContributions(username);
    const data = parseContributions(html);

    if (data.length === 0) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(404).send(generateErrorSVG(`No contribution data found for "${username}"`));
    }

    const svg = generateSVG(data, username);
    res.setHeader('Content-Type', 'image/svg+xml');
    //image age
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60');
    return res.status(200).send(svg);
  } catch (err) {
    console.error('Error generating SVG:', err.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(500).send(generateErrorSVG(`Could not load data for "${username}"`));
  }
};

// ===== FETCH =====
function fetchContributions(username) {
  const url = `https://github.com/users/${username}/contributions`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (3D-GitHub-Contrib-SVG)' } }, (response) => {
      if (response.statusCode === 404) {
        return reject(new Error('User not found'));
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`GitHub returned status ${response.statusCode}`));
      }
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// ===== PARSE =====
function parseContributions(html) {
  const data = [];
  // Match <td> elements with data-date and data-level attributes
  const tdRegex = /<td[^>]*data-date="([^"]+)"[^>]*data-level="([^"]+)"[^>]*>[\s\S]*?<\/td>/gi;
  let match;

  while ((match = tdRegex.exec(html)) !== null) {
    const date = match[1];
    const level = parseInt(match[2], 10) || 0;

    // Try to extract count from tool-tip text within the td
    let count = 0;
    const tipMatch = match[0].match(/(\d+)\s+contribution/i);
    if (tipMatch) {
      count = parseInt(tipMatch[1], 10);
    } else if (level > 0) {
      count = [0, 1, 4, 8, 16][level] || level;
    }

    data.push({ date, count, level });
  }

  // Fallback: try data-level before data-date order
  if (data.length === 0) {
    const tdRegex2 = /<td[^>]*data-level="([^"]+)"[^>]*data-date="([^"]+)"[^>]*>[\s\S]*?<\/td>/gi;
    while ((match = tdRegex2.exec(html)) !== null) {
      const level = parseInt(match[1], 10) || 0;
      const date = match[2];
      let count = 0;
      const tipMatch = match[0].match(/(\d+)\s+contribution/i);
      if (tipMatch) count = parseInt(tipMatch[1], 10);
      else if (level > 0) count = [0, 1, 4, 8, 16][level] || level;
      data.push({ date, count, level });
    }
  }

  return data;
}

// ===== GROUP BY WEEKS =====
function groupByWeeks(data) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  let currentWeek = [];

  if (sorted.length === 0) return weeks;

  const firstDate = new Date(sorted[0].date + 'T00:00:00Z');
  const firstDay = firstDate.getUTCDay(); // 0=Sun
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

  for (const d of sorted) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

// ===== ISO PROJECTION =====
function isoProject(x, y, z) {
  // Isometric projection: convert 3D grid coords to 2D screen coords
  const isoX = (x - y) * Math.cos(ISO_ANGLE);
  const isoY = (x + y) * Math.sin(ISO_ANGLE) - z;
  return { x: isoX, y: isoY };
}

// ===== GENERATE SVG =====
function generateSVG(data, username) {
  const weeks = groupByWeeks(data);
  const numWeeks = weeks.length;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  const step = CELL_W + GAP;

  // Calculate bounds by checking all projected points
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const entry = weeks[w][d];
      if (!entry) continue;
      const height = entry.level === 0 ? BASE_HEIGHT : BASE_HEIGHT + (entry.count / maxCount) * MAX_HEIGHT;
      const x = w * step;
      const y = d * step;

      // Check all 4 corners of the cell at both z=0 and z=height
      const corners = [
        isoProject(x, y, 0),
        isoProject(x + CELL_W, y, 0),
        isoProject(x, y + CELL_W, 0),
        isoProject(x + CELL_W, y + CELL_W, 0),
        isoProject(x, y, height),
        isoProject(x + CELL_W, y, height),
        isoProject(x, y + CELL_W, height),
        isoProject(x + CELL_W, y + CELL_W, height),
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

  // Render back-to-front for proper z-ordering (painter's algorithm)
  // We render from bottom-right to top-left in grid space
  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const entry = weeks[w][d];
      if (!entry) continue;

      const colors = LEVEL_COLORS[entry.level] || LEVEL_COLORS[0];
      const height = entry.level === 0 ? BASE_HEIGHT : BASE_HEIGHT + (entry.count / maxCount) * MAX_HEIGHT;

      const x = w * step;
      const y = d * step;

      // 8 corners of the 3D block
      const p = {
        // Bottom face corners
        b_fl: isoProject(x, y + CELL_W, 0),           // bottom-front-left
        b_fr: isoProject(x + CELL_W, y + CELL_W, 0),  // bottom-front-right
        b_bl: isoProject(x, y, 0),                      // bottom-back-left
        b_br: isoProject(x + CELL_W, y, 0),             // bottom-back-right
        // Top face corners
        t_fl: isoProject(x, y + CELL_W, height),
        t_fr: isoProject(x + CELL_W, y + CELL_W, height),
        t_bl: isoProject(x, y, height),
        t_br: isoProject(x + CELL_W, y, height),
      };

      // Apply offset
      for (const key of Object.keys(p)) {
        p[key].x += offsetX;
        p[key].y += offsetY;
      }

      // Left face (visible side)
      paths += `<path d="M${f(p.b_fl.x)},${f(p.b_fl.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} L${f(p.t_bl.x)},${f(p.t_bl.y)} L${f(p.b_bl.x)},${f(p.b_bl.y)} Z" fill="${colors.left}"/>`;

      // Right face (visible side)
      paths += `<path d="M${f(p.b_fl.x)},${f(p.b_fl.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} L${f(p.t_fr.x)},${f(p.t_fr.y)} L${f(p.b_fr.x)},${f(p.b_fr.y)} Z" fill="${colors.right}"/>`;

      // Top face
      paths += `<path d="M${f(p.t_bl.x)},${f(p.t_bl.y)} L${f(p.t_br.x)},${f(p.t_br.y)} L${f(p.t_fr.x)},${f(p.t_fr.y)} L${f(p.t_fl.x)},${f(p.t_fl.y)} Z" fill="${colors.top}"/>`;
    }
  }

  // Legend
  const legendY = svgHeight - legendHeight + 10;
  const legendX = svgWidth / 2 - 80;
  let legend = `<text x="${legendX}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, -apple-system, sans-serif">Less</text>`;
  const levels = [0, 1, 2, 3, 4];
  levels.forEach((lvl, i) => {
    legend += `<rect x="${legendX + 32 + i * 16}" y="${legendY}" width="12" height="12" rx="2" fill="${LEVEL_COLORS[lvl].top}"/>`;
  });
  legend += `<text x="${legendX + 32 + 5 * 16}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, -apple-system, sans-serif">More</text>`;

  // Title
  const title = `<text x="${padding}" y="28" fill="${ACCENT_COLOR}" font-size="16" font-weight="700" font-family="Inter, -apple-system, sans-serif">@${escapeXml(username)}</text>`;

  // Watermark
  const watermark = `<text x="${svgWidth - padding}" y="${svgHeight - 8}" fill="${TEXT_COLOR}" font-size="10" font-family="Inter, -apple-system, sans-serif" text-anchor="end" opacity="0.5">3D GitHub Contributions</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(svgWidth)}" height="${Math.ceil(svgHeight)}" viewBox="0 0 ${Math.ceil(svgWidth)} ${Math.ceil(svgHeight)}">
  <rect width="100%" height="100%" fill="${BG_COLOR}" rx="12"/>
  ${title}
  ${paths}
  ${legend}
  ${watermark}
</svg>`;
}

// ===== ERROR SVG =====
function generateErrorSVG(message) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120" viewBox="0 0 480 120">
  <rect width="100%" height="100%" fill="${BG_COLOR}" rx="12"/>
  <text x="240" y="55" fill="#f85149" font-size="14" font-family="Inter, -apple-system, sans-serif" text-anchor="middle" font-weight="600">⚠ Error</text>
  <text x="240" y="78" fill="${TEXT_COLOR}" font-size="12" font-family="Inter, -apple-system, sans-serif" text-anchor="middle">${escapeXml(message)}</text>
</svg>`;
}

// ===== HELPERS =====
function f(n) {
  return Math.round(n * 100) / 100;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
