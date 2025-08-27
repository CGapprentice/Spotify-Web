let currentAlbum = null;
let albumSession = null;
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
            
            albumSession = data.session_info;
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
    
    // Get album image - prefer higher quality image
    const imageUrl = currentAlbum.images && currentAlbum.images.length > 0 
        ? currentAlbum.images[0].url 
        : (currentAlbum.image || 'https://via.placeholder.com/300x300/282828/b3b3b3?text=♪');
    
    // Safely get artist names with multiple fallbacks
    let artistNames = 'Unknown Artist';
    if (currentAlbum.artists && Array.isArray(currentAlbum.artists)) {
        artistNames = currentAlbum.artists.map(artist => artist.name).join(', ');
    } else if (currentAlbum.artist) {
        artistNames = currentAlbum.artist;
    } else if (tracks.length > 0 && tracks[0].artists) {
        // Fallback: get artist from first track
        artistNames = tracks[0].artists.map(artist => artist.name).join(', ');
    }

    container.innerHTML = `
        <!-- Album Header -->
        <div class="flex flex-col lg:flex-row gap-8 mb-8 p-8 bg-spotify-card rounded-xl">
            <div class="flex-shrink-0 mx-auto lg:mx-0">
                <img src="${imageUrl}" alt="${currentAlbum.name}" class="w-64 h-64 rounded-xl object-cover shadow-2xl">
            </div>
            <div class="flex flex-col justify-center text-center lg:text-left">
                <h1 class="text-4xl lg:text-5xl font-bold text-spotify-text mb-6">${currentAlbum.name}</h1>
                <div class="space-y-3 mb-6">
                    <p class="text-xl text-spotify-text-secondary">
                        <span class="font-semibold text-spotify-text">Artist:</span> ${artistNames}
                    </p>
                    <p class="text-lg text-spotify-text-secondary">
                        <span class="font-semibold text-spotify-text">Release:</span> ${currentAlbum.release_date || 'Unknown'}
                    </p>
                    <p class="text-lg text-spotify-text-secondary">
                        <span class="font-semibold text-spotify-text">Tracks:</span> ${tracks.length}
                    </p>
                </div>
                <div class="bg-spotify-hover p-4 rounded-lg">
                    <p class="text-sm text-spotify-text-secondary mb-2">Rating Progress</p>
                    <p class="text-lg font-semibold text-spotify-text mb-3">${albumSession?.rated_tracks || 0}/${albumSession?.total_tracks || tracks.length} tracks rated</p>
                    <div class="w-full bg-spotify-border rounded-full h-3">
                        <div class="bg-gradient-to-r from-spotify-green to-spotify-green-hover h-3 rounded-full transition-all duration-500" style="width: ${albumSession?.completion_percentage || 0}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Songs Container -->
        <div class="space-y-2 mb-8" id="songs-container">
            <!-- Songs will be populated here -->
        </div>
        
        <!-- Stats Card -->
        <div class="stats-card" id="stats">
            <h3 class="stats-title">Average Rating</h3>
            <div class="average-rating" id="average-rating">${albumSession?.average_rating || '-'}</div>
        </div>
    `;

    const songsContainer = document.getElementById('songs-container');
    
    tracks.forEach((track, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        
        const duration = formatDuration(track.duration_ms);
        const trackArtists = track.artists && Array.isArray(track.artists)
            ? track.artists.map(artist => artist.name).join(', ')
            : artistNames; // Fallback to album artist

        songElement.innerHTML = `
            <div class="song-info">
                <div class="song-name">${track.name}</div>
                <div class="song-artist">${trackArtists}</div>
            </div>
            <div class="song-duration">${duration}</div>
            <button class="play-btn" onclick="togglePlay('${track.uri}', '${track.preview_url || ''}')" data-track-uri="${track.uri}" data-preview-url="${track.preview_url || ''}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
            <div class="rating-container" data-track-id="${track.id}">
                ${generateRatingButtons(track.id, track.user_rating)}
            </div>
        `;

        songsContainer.appendChild(songElement);
    });

    updateStats();
}

function generateRatingButtons(trackId, currentRating) {
    let buttonsHtml = '';
    for (let i = 1; i <= 10; i++) {
        const isSelected = currentRating === i ? 'selected' : '';
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
    fetch('/api/rate-track', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            track_id: trackId,
            album_id: currentAlbum.id,
            rating: rating
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update button states
            const ratingContainer = document.querySelector(`[data-track-id="${trackId}"]`);
            const buttons = ratingContainer.querySelectorAll('.rating-btn');
            
            buttons.forEach(button => {
                button.classList.remove('selected');
                if (parseInt(button.dataset.rating) === rating) {
                    button.classList.add('selected');
                }
            });
            
            // Update session info
            albumSession = data.session;
            updateStats();
            updateProgress();
        } else {
            console.error('Rating failed:', data.error);
            alert('Failed to save rating. Please try again.');
        }
    })
    .catch(error => {
        console.error('Rating request failed:', error);
        alert('Failed to save rating. Please check your connection.');
    });
}

function updateStats() {
    const averageElement = document.getElementById('average-rating');
    if (albumSession && albumSession.average_rating) {
        // Ensure we display at most 2 decimal places
        const formattedRating = typeof albumSession.average_rating === 'number' 
            ? albumSession.average_rating.toFixed(2)
            : parseFloat(albumSession.average_rating).toFixed(2);
        averageElement.textContent = formattedRating;
    } else {
        averageElement.textContent = '-';
    }
}

function updateProgress() {
    if (!albumSession) return;
    
    // Update progress text and bar
    const progressText = document.querySelector('.text-gray-400');
    const progressBar = document.querySelector('.bg-spotify-green');
    
    if (progressText) {
        progressText.textContent = `Progress: ${albumSession.rated_tracks || 0}/${albumSession.total_tracks || 0} rated`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${albumSession.completion_percentage || 0}%`;
    }
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
    if (audioElement && !audioElement.paused && currentlyPlaying === trackUri) {
        audioElement.pause();
        audioElement = null;
        currentlyPlaying = null;
        updatePlayButtons(null);
        return;
    }

    if (audioElement && !audioElement.paused) {
        audioElement.pause();
        audioElement = null;
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