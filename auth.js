// --- PKCE helpers ---
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for(let i=0; i<length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function base64encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64encode(digest);
}

// --- Redirect user to Spotify login ---
async function redirectToSpotifyLogin() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES,
  });

  window.location = 'https://accounts.spotify.com/authorize?' + params.toString();
}

document.getElementById('login-btn').addEventListener('click', redirectToSpotifyLogin);

// --- After redirect: exchange code for tokens ---
async function fetchAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return; // no code in URL

  const codeVerifier = localStorage.getItem('code_verifier');
  if (!codeVerifier) {
    console.error('No code verifier found');
    return;
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to get token:', errorText);
    return;
  }

  const data = await res.json();
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_refresh_token', data.refresh_token);

  // Clear URL to avoid multiple exchanges
  window.history.replaceState({}, document.title, REDIRECT_URI);

  // Reload app to initialize with token
  window.location.reload();
}

// Call on page load to handle redirect
window.onload = fetchAccessToken;
