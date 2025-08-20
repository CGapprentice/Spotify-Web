let currentAlbum = null;
let songRatings = {};

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