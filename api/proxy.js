export default async function handler(req, res) {
  const targetUrl = 'https://colrip-portal.azurewebsites.net/api/pdams/GetCurrentVesselTraffic';

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': req.headers['user-agent'] || 'River-Watch/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch from target: ${response.statusText}` 
      });
    }

    const data = await response.json();
    
    // Set CORS headers for our own frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Vercel Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error in Proxy' });
  }
}
