document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('spotify_access_token');
  if (!token) return;

  document.getElementById('mood-buttons').style.display = 'block';

  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
      name: 'Mood Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.8
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      window.device_id = device_id;
      document.getElementById('player-status').textContent = "Player ready!";
    });

    player.addListener('initialization_error', ({ message }) => console.error(message));
    player.addListener('authentication_error', ({ message }) => console.error(message));
    player.addListener('account_error', ({ message }) => console.error(message));
    player.addListener('playback_error', ({ message }) => console.error(message));

    player.connect();
  };

  const script = document.createElement('script');
  script.src = "https://sdk.scdn.co/spotify-player.js";
  document.body.appendChild(script);
});

async function setMood(mood) {
  const token = localStorage.getItem('spotify_access_token');
  let options = {
    happy: { seed_genres: 'pop', target_valence: 0.9 },
    sad: { seed_genres: 'acoustic', target_valence: 0.2 },
    chill: { seed_genres: 'chill', target_energy: 0.3 }
  }[mood];

  const query = new URLSearchParams({
    ...options,
    limit: 10
  });

  const res = await fetch(`https://api.spotify.com/v1/recommendations?${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const track = data.tracks[0];
  playTrack(track.uri);
}

async function playTrack(uri) {
  const token = localStorage.getItem('spotify_access_token');
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.device_id}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri] }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}
