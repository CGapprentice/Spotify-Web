let currentAlbum = null;
let songRatings = {};
let player = null;
let deviceId = null;
let currentlyPlaying = null;
let audioElement = null;

window.onSpotifyWebPlaybackSDKReady = () => {
    initializePlayer();
};

document.addEventListener('DOMContentLoaded', function() {
    loadAlbumData();
});

function loadAlbumData() {
    const albumData = sessionStorage.getItem('selectedAlbum');
    
    if (!albumData) {
        document.getElementById('album-content').innerHTML = 
            '<div class="text-center py-16 text-red-400">No album data found. Please go back and select an album.</div>';
        return;
    }

    currentAlbum = JSON.parse(albumData);
    
    const savedRatings = localStorage.getItem(`ratings_${currentAlbum.id}`);
    if (savedRatings) {
        songRatings = JSON.parse(savedRatings);
    }

    fetchAlbumTracks();
}

function initializePlayer() {
    fetch('/api/get-token')
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                player = new Spotify.Player({
                    name: 'DiscogMe Player',
                    getOAuthToken: cb => { cb(data.access_token); },
                    volume: 0.5
                });

                player.addListener('ready', ({ device_id }) => {
                    console.log('Ready with Device ID', device_id);
                    deviceId = device_id;
                    transferPlayback(device_id);
                });

                player.addListener('not_ready', ({ device_id }) => {
                    console.log('Device ID has gone offline', device_id);
                    deviceId = null;
                });

                player.addListener('player_state_changed', (state) => {
                    if (!state) {
                        updatePlayButtons(null);
                        return;
                    }
                    updatePlayButtons(state.track_window.current_track.uri);
                });

                player.addListener('initialization_error', ({ message }) => {
                    console.error('Initialization Error:', message);
                });

                player.addListener('authentication_error', ({ message }) => {
                    console.error('Authentication Error:', message);
                });

                player.addListener('account_error', ({ message }) => {
                    console.error('Account Error:', message);
                });

                player.connect();
            }
        })
        .catch(error => {
            console.log('Player initialization failed:', error);
        });
}

function transferPlayback(deviceId) {
    return fetch('/api/transfer-playback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Playback transferred to DiscogMe Player');
            return true;
        } else {
            console.error('Transfer failed:', data.error);
            return false;
        }
    })
    .catch(error => {
        console.log('Transfer playback failed:', error);
        return false;
    });
}

function fetchAlbumTracks() {
    fetch(`/api/album-tracks/${currentAlbum.id}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    throw new Error('Please log in to view album tracks');
                }
                throw new Error('Failed to fetch album tracks');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message || 'Error fetching tracks');
            }
            displayAlbumWithTracks(data.items || []);
        })
        .catch(error => {
            document.getElementById('album-content').innerHTML = 
                `<div class="text-center py-16 text-red-400">Error loading tracks: ${error.message}</div>`;
            console.error('Error fetching tracks:', error);
        });
}

function displayAlbumWithTracks(tracks) {
    const container = document.getElementById('album-content');
    
    const imageUrl = currentAlbum.images && currentAlbum.images.length > 0 
        ? currentAlbum.images[0].url 
        : 'placeholder.jpg';
    
    const artistNames = currentAlbum.artists
        .map(artist => artist.name)
        .join(', ');

    container.innerHTML = `
        <!-- Album Header -->
        <div class="flex flex-col md:flex-row gap-6 mb-8 p-6 bg-spotify-card rounded-lg">
            <img src="${imageUrl}" alt="${currentAlbum.name}" class="w-48 h-48 rounded-lg object-cover shadow-lg mx-auto md:mx-0">
            <div class="flex flex-col justify-center text-center md:text-left">
                <h1 class="text-3xl md:text-4xl font-bold text-spotify-text mb-4">${currentAlbum.name}</h1>
                <p class="text-lg text-spotify-text-secondary mb-2">
                    <span class="font-semibold">Artist:</span> ${artistNames}
                </p>
                <p class="text-lg text-spotify-text-secondary mb-2">
                    <span class="font-semibold">Release Date:</span> ${currentAlbum.release_date || 'Unknown'}
                </p>
                <p class="text-lg text-spotify-text-secondary">
                    <span class="font-semibold">Total Tracks:</span> ${tracks.length}
                </p>
            </div>
        </div>
        
        <!-- Songs Container -->
        <div class="space-y-2 mb-8" id="songs-container">
            <!-- Songs will be populated here -->
        </div>
        
        <!-- Stats Card -->
        <div class="stats-card" id="stats">
            <h3 class="stats-title">Average Rating</h3>
            <div class="average-rating" id="average-rating">-</div>
        </div>
    `;

    const songsContainer = document.getElementById('songs-container');
    
    tracks.forEach((track, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        
        const duration = formatDuration(track.duration_ms);
        const trackArtists = track.artists
            .map(artist => artist.name)
            .join(', ');

        songElement.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="song-name truncate">${track.name}</div>
                <div class="song-artist truncate">${trackArtists}</div>
            </div>
            <button class="play-btn" onclick="togglePlay('${track.uri}', '${track.preview_url || ''}')" data-track-uri="${track.uri}" data-preview-url="${track.preview_url || ''}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
            <div class="song-duration">${duration}</div>
            <div class="rating-container" data-track-id="${track.id}">
                ${generateRatingButtons(track.id)}
            </div>
        `;

        songsContainer.appendChild(songElement);
    });

    updateStats();
}

function generateRatingButtons(trackId) {
    let buttonsHtml = '';
    for (let i = 1; i <= 10; i++) {
        const isSelected = songRatings[trackId] === i ? 'selected' : '';
        buttonsHtml += `
            <button class="rating-btn ${isSelected}" 
                    onclick="rateSong('${trackId}', ${i})" 
                    data-rating="${i}">
                ${i}
            </button>
        `;
    }
    return buttonsHtml;
}

function rateSong(trackId, rating) {
    songRatings[trackId] = rating;
    localStorage.setItem(`ratings_${currentAlbum.id}`, JSON.stringify(songRatings));
    
    const ratingContainer = document.querySelector(`[data-track-id="${trackId}"]`);
    const buttons = ratingContainer.querySelectorAll('.rating-btn');
    
    buttons.forEach(button => {
        button.classList.remove('selected');
        if (parseInt(button.dataset.rating) === rating) {
            button.classList.add('selected');
        }
    });

    updateStats();
}

function updateStats() {
    const ratings = Object.values(songRatings);
    const averageElement = document.getElementById('average-rating');
    
    if (ratings.length === 0) {
        averageElement.textContent = '-';
        return;
    }

    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    averageElement.textContent = average.toFixed(1);
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function goBack() {
    window.location.href = '/albums';
}

function togglePlay(trackUri, previewUrl) {
    if (audioElement && !audioElement.paused) {
        audioElement.pause();
        audioElement = null;
        currentlyPlaying = null;
        updatePlayButtons(null);
        return;
    }

    if (!player || !deviceId) {
        if (previewUrl) {
            playPreview(trackUri, previewUrl);
            return;
        }
        alert('Player not ready and no preview available. Please make sure you have Spotify Premium.');
        return;
    }

    player.getCurrentState().then(state => {
        if (state && state.track_window.current_track.uri === trackUri && !state.paused) {
            player.pause().then(() => {
                currentlyPlaying = null;
                updatePlayButtons(null);
            });
        } else {
            fetch('/api/play-track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    track_uri: trackUri,
                    device_id: deviceId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setTimeout(() => {
                        player.resume().then(() => {
                            currentlyPlaying = trackUri;
                            updatePlayButtons(trackUri);
                        }).catch(err => {
                            console.error('Resume failed:', err);
                            if (previewUrl) {
                                console.log('Falling back to preview...');
                                playPreview(trackUri, previewUrl);
                            }
                        });
                    }, 500);
                } else {
                    console.error('Play failed:', data.error);
                    if (data.error && data.error.reason === 'NO_ACTIVE_DEVICE') {
                        console.log('Retrying with device transfer...');
                        transferPlayback(deviceId).then(() => {
                            setTimeout(() => togglePlay(trackUri, previewUrl), 1000);
                        });
                    } else if (previewUrl) {
                        console.log('Spotify playback failed, using preview...');
                        playPreview(trackUri, previewUrl);
                    } else {
                        alert('Failed to play track. Error: ' + (data.error?.message || 'Unknown error'));
                    }
                }
            })
            .catch(error => {
                console.error('Play request failed:', error);
                if (previewUrl) {
                    console.log('Network error, falling back to preview...');
                    playPreview(trackUri, previewUrl);
                }
            });
        }
    }).catch(err => {
        console.error('Get state failed:', err);
        if (previewUrl) {
            playPreview(trackUri, previewUrl);
        }
    });
}

function playPreview(trackUri, previewUrl) {
    if (audioElement) {
        audioElement.pause();
    }
    
    audioElement = new Audio(previewUrl);
    audioElement.volume = 0.5;
    
    audioElement.play().then(() => {
        currentlyPlaying = trackUri;
        updatePlayButtons(trackUri);
    }).catch(err => {
        console.error('Preview playback failed:', err);
        alert('Audio playback failed. Please check your browser settings.');
    });
    
    audioElement.addEventListener('ended', () => {
        currentlyPlaying = null;
        updatePlayButtons(null);
        audioElement = null;
    });
}

function updatePlayButtons(playingUri) {
    document.querySelectorAll('.play-btn').forEach(btn => {
        const trackUri = btn.getAttribute('data-track-uri');
        const svg = btn.querySelector('svg path');
        
        if (playingUri === trackUri) {
            btn.classList.add('playing');
            svg.setAttribute('d', 'M6 4h4v16H6V4zm8 0h4v16h-4V4z');
        } else {
            btn.classList.remove('playing');
            svg.setAttribute('d', 'M8 5v14l11-7z');
        }
    });
}