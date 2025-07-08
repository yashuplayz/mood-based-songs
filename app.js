const clientId = 'f5567173ea2343d5867eb33eae459285';

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfoDiv = document.getElementById('user-info');
const songsList = document.getElementById('songs-list');
const moodButtons = document.querySelectorAll('#mood-buttons button');

let accessToken = localStorage.getItem('spotify_access_token');
let refreshToken = localStorage.getItem('spotify_refresh_token');
let tokenTimestamp = localStorage.getItem('spotify_token_timestamp');

function isTokenExpired() {
  if (!tokenTimestamp) return true;
  const now = Date.now();
  const elapsed = (now - parseInt(tokenTimestamp, 10)) / 1000;
  return elapsed > 3600;
}

async function refreshAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', clientId);

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json();

    if (data.access_token) {
      accessToken = data.access_token;
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_token_timestamp', Date.now().toString());
      console.log('✅ Access token refreshed');
    } else {
      console.error('❌ Failed to refresh token:', data);
      logout();
    }
  } catch (err) {
    console.error('❌ Token refresh error:', err);
    logout();
  }
}

async function ensureValidToken() {
  if (!accessToken || isTokenExpired()) {
    console.warn('⚠️ Token expired or missing, refreshing...');
    await refreshAccessToken();
  }
}

async function getUserProfile() {
  await ensureValidToken();
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to get user profile');

  return await res.json();
}

async function getRecommendations(mood) {
  await ensureValidToken();

  // Valid genres list (subset)
  const seedGenres = {
    happy: 'pop',
    sad: 'acoustic',
    chill: 'ambient',
  };

  // Get genre for mood or fallback
  const genre = seedGenres[mood] || 'pop';

  const params = new URLSearchParams({
    limit: 10,
    seed_genres: genre,
    // Remove target_valence and target_energy to simplify and avoid errors
  });

  try {
    const res = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error fetching recommendations:', res.status);
      console.error('Error response:', errorText);
      songsList.innerHTML = `<p>Failed to get recommendations. Please try again.</p>`;
      return [];
    }

    const data = await res.json();
    return data.tracks;
  } catch (err) {
    console.error('Fetch error:', err);
    songsList.innerHTML = `<p>Network error. Please check your connection.</p>`;
    return [];
  }
}


function formatArtists(artists) {
  return artists.map(a => a.name).join(', ');
}

function renderSongs(tracks) {
  if (!tracks || tracks.length === 0) {
    songsList.innerHTML = '<p>No songs found for this mood.</p>';
    return;
  }

  songsList.innerHTML = '';
  tracks.forEach(track => {
    const songDiv = document.createElement('div');
    songDiv.className = 'song';

    songDiv.innerHTML = `
      <img src="${track.album.images[0]?.url || ''}" alt="Cover" width="64" height="64" />
      <div class="song-info">
        <div class="song-title">${track.name}</div>
        <div class="song-artists">${formatArtists(track.artists)}</div>
      </div>
    `;

    songDiv.addEventListener('click', () => playTrack(track.uri));

    songsList.appendChild(songDiv);
  });
}

function initializePlayer(token) {
  return new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'Mood Player',
        getOAuthToken: cb => cb(token),
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Player ready. Device ID:', device_id);
        window.device_id = device_id;
        resolve(player);
      });

      player.addListener('initialization_error', ({ message }) => reject(message));
      player.addListener('authentication_error', ({ message }) => reject(message));
      player.addListener('account_error', ({ message }) => reject(message));
      player.addListener('playback_error', ({ message }) => console.error('Playback error:', message));

      player.connect();
    };

    const script = document.createElement('script');
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
  });
}

async function playTrack(uri) {
  await ensureValidToken();

  if (!window.device_id) {
    alert('Player is not ready yet. Please wait.');
    return;
  }

  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.device_id}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri] }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Could not play track:', errorText);
    alert('Failed to play track. Do you have Spotify Premium?');
  }
}

async function initApp() {
  if (!accessToken) {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
    return;
  }

  loginSection.style.display = 'none';
  appSection.style.display = 'block';

  try {
    const profile = await getUserProfile();
    userInfoDiv.innerHTML = `<p>Logged in as <strong>${profile.display_name}</strong></p>`;
    await initializePlayer(accessToken);
  } catch (e) {
    console.error('Init error:', e);
    userInfoDiv.innerHTML = `<p>Error initializing. Please log in again.</p>`;
    logout();
  }
}

function logout() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_timestamp');
  window.location.reload();
}

moodButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    songsList.innerHTML = '<p>Loading songs...</p>';
    const mood = btn.getAttribute('data-mood');
    const tracks = await getRecommendations(mood);
    renderSongs(tracks);
    if (tracks.length > 0) playTrack(tracks[0].uri);
  });
});

window.addEventListener('load', initApp);
