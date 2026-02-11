const https = require('https');

module.exports = async function handler(req, res) {
    const username = req.query.user || req.query.username;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const html = await fetchContributions(username);
        const data = parseContributions(html);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No contribution data found for this user' });
        }

        // Set caching headers
        //image age
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60');
        return res.status(200).json({ user: username, contributions: data });
    } catch (err) {
        console.error('Error fetching data:', err);
        return res.status(500).json({ error: 'Failed to fetch contribution data' });
    }
};

function fetchContributions(username) {
    return new Promise((resolve, reject) => {
        const url = `https://github.com/users/${username}/contributions`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(data);
                else reject(new Error(`GitHub returned ${res.statusCode}`));
            });
        }).on('error', reject);
    });
}

function parseContributions(html) {
    const data = [];
    const regex = /<td[^>]*data-date="([^"]*)"[^>]*data-level="([^"]*)"[^>]*>[\s\S]*?<\/td>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const date = match[1];
        const level = parseInt(match[2], 10) || 0;

        // Attempt to extract count from tooltip if possible, otherwise estimate from level
        let count = 0;
        const tooltipMatch = match[0].match(/(\d+)\s+contribution/i);
        if (tooltipMatch) {
            count = parseInt(tooltipMatch[1], 10);
        } else if (level > 0) {
            count = [0, 1, 4, 8, 16][level] || level;
        }

        data.push({ date, count, level });
    }
    return data;
}
