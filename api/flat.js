// Vercel Serverless Function: Generate 2D Flat GitHub Contribution SVG
// Usage: /api/flat?user=USERNAME

const https = require('https');

// ===== CONFIG =====
// Using the "top" color from the existing 3D setup for the flat squares
const LEVEL_COLORS = {
  0: '#161b22', // Empty
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353',
};

const BG_COLOR = '#0a0e17';
const TEXT_COLOR = '#8b949e';
const ACCENT_COLOR = '#39d353';

// Flat cell dimensions
const CELL_SIZE = 12;
const GAP = 3;
const RADIUS = 2; // Rounded corners for squares

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
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (2D-GitHub-Contrib-SVG)' } }, (response) => {
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
  const tdRegex = /<td[^>]*data-date="([^"]+)"[^>]*data-level="([^"]+)"[^>]*>[\s\S]*?<\/td>/gi;
  let match;

  while ((match = tdRegex.exec(html)) !== null) {
    const date = match[1];
    const level = parseInt(match[2], 10) || 0;

    let count = 0;
    const tipMatch = match[0].match(/(\d+)\s+contribution/i);
    if (tipMatch) {
      count = parseInt(tipMatch[1], 10);
    } else if (level > 0) {
      count = [0, 1, 4, 8, 16][level] || level;
    }

    data.push({ date, count, level });
  }

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

// ===== GENERATE SVG =====
function generateSVG(data, username) {
  const weeks = groupByWeeks(data);
  const numWeeks = weeks.length;
  
  // Get Current GMT Time for watermark
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').split('.')[0] + ' GMT';

  const step = CELL_SIZE + GAP;

  // Calculate SVG Dimensions
  const paddingX = 40;
  const paddingY = 30;
  const titleHeight = 40;
  const legendHeight = 40;
  
  const graphWidth = numWeeks * step - GAP;
  const graphHeight = 7 * step - GAP;
  
  const svgWidth = graphWidth + paddingX * 2;
  const svgHeight = graphHeight + paddingY * 2 + titleHeight + legendHeight;

  // Month labels logic (approximation based on weeks width)
  // To keep it simple, we skip month labels or just add the title and legend.
  
  let paths = '';

  const offsetX = paddingX;
  const offsetY = paddingY + titleHeight;

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const entry = weeks[w][d];
      if (!entry) continue; // Skip empty days at the start/end of the year

      const color = LEVEL_COLORS[entry.level] || LEVEL_COLORS[0];
      const x = offsetX + w * step;
      const y = offsetY + d * step;

      paths += `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="${RADIUS}" fill="${color}" />\n`;
    }
  }

  // Legend
  const legendY = svgHeight - legendHeight + 10;
  const legendX = svgWidth - paddingX - (5 * 16) - 40 - 20; // right-aligned roughly
  
  let legend = `<text x="${legendX}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, -apple-system, sans-serif">Less</text>`;
  const levels = [0, 1, 2, 3, 4];
  levels.forEach((lvl, i) => {
    legend += `<rect x="${legendX + 32 + i * 16}" y="${legendY}" width="12" height="12" rx="${RADIUS}" fill="${LEVEL_COLORS[lvl]}"/>`;
  });
  legend += `<text x="${legendX + 32 + 5 * 16 + 4}" y="${legendY + 10}" fill="${TEXT_COLOR}" font-size="11" font-family="Inter, -apple-system, sans-serif">More</text>`;

  // Title
  const total = data.reduce((s, d) => s + d.count, 0);
  const titleText = `${total} contributions in the last year`;
  const title = `<text x="${paddingX}" y="${paddingY + 15}" fill="${TEXT_COLOR}" font-size="14" font-weight="500" font-family="Inter, -apple-system, sans-serif">${titleText} - <tspan fill="${ACCENT_COLOR}" font-weight="700">@${escapeXml(username)}</tspan></text>`;

  // Watermark (GMT Timestamp)
  const watermark = `<text x="${svgWidth - paddingX}" y="${svgHeight - 8}" fill="${TEXT_COLOR}" font-size="9" font-family="Inter, -apple-system, sans-serif" text-anchor="end" opacity="0.6">${timestamp}</text>`;

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
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
