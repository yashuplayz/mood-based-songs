const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfoDiv = document.getElementById('user-info');
const songsList = document.getElementById('songs-list');
const moodButtons = document.querySelectorAll('#mood-buttons button');

let accessToken = localStorage.getItem('spotify_access_token');

async function getUserProfile() {
  if (!accessToken) throw new Error('No access token');

  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error('User profile fetch error:', res.status, res.statusText);
    throw new Error('Failed to get user profile');
  }
  return await res.json();
}

async function getRecommendations(mood) {
  if (!accessToken) throw new Error('No access token');

  const seedGenres = {
    happy: 'pop',
    sad: 'acoustic',
    chill: 'lofi',
  };

  const params = new URLSearchParams({
    limit: 10,
    seed_genres: seedGenres[mood] || 'pop',
    // Removed target_valence and target_energy to prevent 404
  });

  const url = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error('Error fetching recommendations:', res.status, res.statusText);
    songsList.innerHTML = `<p>Failed to get recommendations. Please login again.</p>`;
    return [];
  }

  const data = await res.json();
  return data.tracks;
}

function formatArtists(artists) {
  return artists.map(a => a.name).join(', ');
}

function renderSongs(tracks) {
  if (tracks.length === 0) {
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

    songDiv.addEventListener('click', () => {
      playTrack(track.uri);
    });

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
        console.log('Spotify Player ready with Device ID', device_id);
        window.device_id = device_id;
        resolve(player);
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Initialization error:', message);
        reject(message);
      });
      player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication error:', message);
        reject(message);
      });
      player.addListener('account_error', ({ message }) => {
        console.error('Account error:', message);
        reject(message);
      });
      player.addListener('playback_error', ({ message }) => {
        console.error('Playback error:', message);
      });

      player.connect();
    };

    // Load the SDK script if not loaded yet
    if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
      const script = document.createElement('script');
      script.src = "https://sdk.scdn.co/spotify-player.js";
      document.body.appendChild(script);
    }
  });
}

async function playTrack(uri) {
  if (!window.device_id) {
    console.error('Device ID not set yet');
    alert('Player not ready. Please wait a moment and try again.');
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
    const error = await res.json();
    console.error('Error playing track:', error);
    alert('Failed to play track. Please make sure you have a Spotify Premium account.');
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
  } catch (error) {
    console.error('User profile fetch failed:', error);
    userInfoDiv.innerHTML = `<p>Failed to fetch user info. Try logging in again.</p>`;
    return;
  }

  try {
    await initializePlayer(accessToken);
  } catch (e) {
    console.error('Failed to initialize player:', e);
  }
}

moodButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    songsList.innerHTML = '<p>Loading songs...</p>';
    const mood = btn.getAttribute('data-mood');

    try {
      const tracks = await getRecommendations(mood);
      renderSongs(tracks);

      if (tracks.length > 0) {
        playTrack(tracks[0].uri);
      }
    } catch (error) {
      console.error('Error fetching or playing tracks:', error);
      songsList.innerHTML = '<p>Error loading songs. Please try again.</p>';
    }
  });
});

window.addEventListener('load', initApp);
