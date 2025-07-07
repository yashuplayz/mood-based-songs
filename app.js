const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfoDiv = document.getElementById('user-info');
const songsList = document.getElementById('songs-list');
const moodButtons = document.querySelectorAll('#mood-buttons button');

let accessToken = localStorage.getItem('spotify_access_token');

async function getUserProfile() {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to get user profile');
  return await res.json();
}

async function getRecommendations(mood) {
  const moodConfig = {
    happy: {
      genre: 'pop',
      valence: 0.9,
      energy: 0.8
    },
    sad: {
      genre: 'acoustic',
      valence: 0.2,
      energy: 0.3
    },
    chill: {
      genre: 'chill',
      valence: 0.5,
      energy: 0.2
    }
  };

  const config = moodConfig[mood];
  if (!config) {
    console.error('Invalid mood:', mood);
    return [];
  }

  const params = new URLSearchParams({
    limit: 10,
    seed_genres: config.genre,
    target_valence: config.valence,
    target_energy: config.energy
  });

  const res = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error fetching recommendations:', res.status, errorText);
    songsList.innerHTML = `<p>Failed to get recommendations. (${res.status})</p>`;
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
        console.log('Ready with Device ID', device_id);
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

    const script = document.createElement('script');
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
  });
}

async function playTrack(uri) {
  if (!window.device_id) {
    console.error('Device ID not set yet');
    alert('Player is not ready yet. Please wait a moment and try again.');
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
  } catch {
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
    const tracks = await getRecommendations(mood);
    renderSongs(tracks);

    if (tracks.length > 0) {
      playTrack(tracks[0].uri);
    }
  });
});

window.addEventListener('load', initApp);
