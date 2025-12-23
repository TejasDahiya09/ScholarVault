// Netlify Scheduled Function to keep Render backend warm
// Runs every 10 minutes to prevent cold starts
// Deploy as: netlify/functions/keep-alive.js

export async function handler(event, context) {
  // Only run if triggered by Netlify scheduled function
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const BACKEND_URL = process.env.VITE_API_BASE_URL || 'https://scholarvault.onrender.com';
  
  try {
    // Ping the health check endpoint
    const response = await fetch(`${BACKEND_URL}/healthz`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-KeepAlive/1.0'
      }
    });

    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Backend pinged successfully`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Backend is warm',
          timestamp: new Date().toISOString()
        })
      };
    } else {
      console.error(`Backend ping failed: ${response.status}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Backend ping failed' })
      };
    }
  } catch (error) {
    console.error('Error pinging backend:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to ping backend',
        message: error.message
      })
    };
  }
}

// Schedule: Run every 10 minutes
// Configure in Netlify UI: Site settings > Functions > Scheduled functions
// Schedule: */10 * * * * (every 10 minutes)
