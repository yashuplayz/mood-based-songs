// app.js

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfoDiv = document.getElementById('user-info');
const songsList = document.getElementById('songs-list');
const moodButtons = document.querySelectorAll('#mood-buttons button');

let accessToken = localStorage.getItem('access_token');

function formatArtists(artists) {
  return artists.map(a => a.name).join(', ');
}

async function getUserProfile() {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if(!res.ok) throw new Error('Failed to get user profile');
  return await res.json();
}

async function getRecommendations(mood) {
  const seedGenres = {
    happy: 'pop',
    sad: 'acoustic',
    chill: 'lofi',
  };

  const params = new URLSearchParams({
    limit: 10,
    seed_genres: seedGenres[mood] || 'pop',
  });

  const res = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if(!res.ok) {
    songsList.innerHTML = `<p>Failed to get recommendations. Try logging in again.</p>`;
    return [];
  }
  const data = await res.json();
  return data.tracks;
}

function renderSongs(tracks) {
  if(tracks.length === 0) {
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
        <audio controls src="${track.preview_url || ''}"></audio>
      </div>
    `;

    songsList.appendChild(songDiv);
  });
}

async function initApp() {
  if(!accessToken) {
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
  }
}

moodButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    songsList.innerHTML = '<p>Loading songs...</p>';
    const mood = btn.getAttribute('data-mood');
    const tracks = await getRecommendations(mood);
    renderSongs(tracks);
  });
});

window.addEventListener('load', initApp);
