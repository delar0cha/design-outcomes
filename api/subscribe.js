const PUB_ID = 'pub_7a3c4e28-9455-46df-9cfb-40e0c87d9a54';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Newsletter service not configured yet.' });
  }

  const body = {
    email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: 'ldlr.design',
    utm_medium: 'website',
  };

  const firstName = name ? name.trim().split(' ')[0] : null;
  if (firstName) body.first_name = firstName;

  try {
    const upstream = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Beehiiv error:', data);
      return res.status(upstream.status).json({ error: data.message || 'Subscription failed' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return res.status(500).json({ error: 'Something went wrong on our end.' });
  }
};
