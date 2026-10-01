export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://hozanozxyuvpbwhrvxck.supabase.co/rest/v1/wines?select=id&limit=1';
    const supabaseKey = 'sb_publishable_Ev7uc5vbCnOYWsfoplkvbw_Gi09U9jE';
    
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        message: 'Supabase project pinged successfully! Project remains active.',
        timestamp: new Date().toISOString(),
        count: Array.isArray(data) ? data.length : 0
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: errorText,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
