let currentAlbum = null;
let songRatings = {};

document.addEventListener('DOMContentLoaded', function() {
    loadAlbumData();
});

function loadAlbumData() {
    // album data from sessionStorage
    const albumData = sessionStorage.getItem('selectedAlbum');
    
    if (!albumData) {
        document.getElementById('album-content').innerHTML = 
            '<div class="error">No album data found. Please go back and select an album.</div>';
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
                `<div class="error">Error loading tracks: ${error.message}</div>`;
            console.error('Error fetching tracks:', error);
        });
}

function displayAlbumWithTracks(tracks) {
    const container = document.getElementById('album-content');
    
    // Get album info
    const imageUrl = currentAlbum.images && currentAlbum.images.length > 0 
        ? currentAlbum.images[0].url 
        : 'placeholder.jpg';
    
    const artistNames = currentAlbum.artists
        .map(artist => artist.name)
        .join(', ');

    container.innerHTML = `
        <div class="album-header">
            <img src="${imageUrl}" alt="${currentAlbum.name}" class="album-cover">
            <div class="album-details">
                <h1>${currentAlbum.name}</h1>
                <p><strong>Artist:</strong> ${artistNames}</p>
                <p><strong>Release Date:</strong> ${currentAlbum.release_date || 'Unknown'}</p>
                <p><strong>Total Tracks:</strong> ${tracks.length}</p>
            </div>
        </div>
        
        <div class="songs-container" id="songs-container">
            <!-- Songs will be populated here -->
        </div>
        
        <div class="stats" id="stats">
            <h3>Average Rating</h3>
            <div class="average-rating" id="average-rating">-</div>
        </div>
    `;

    const songsContainer = document.getElementById('songs-container');
    
    tracks.forEach((track, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        
        // Convert duration from milliseconds to mm:ss
        const duration = formatDuration(track.duration_ms);
        
        // Get artist names for this track
        const trackArtists = track.artists
            .map(artist => artist.name)
            .join(', ');

        songElement.innerHTML = `
            <div class="song-info">
                <div class="song-name">${track.name}</div>
                <div class="song-artists">${trackArtists}</div>
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
            <button class="rating-button ${isSelected}" 
                    onclick="rateSong('${trackId}', ${i})" 
                    data-rating="${i}">
                ${i}
            </button>
        `;
    }
    return buttonsHtml;
}

function rateSong(trackId, rating) {
    // Update the rating
    songRatings[trackId] = rating;
    
    // Save to localStorage
    localStorage.setItem(`ratings_${currentAlbum.id}`, JSON.stringify(songRatings));
    
    // Update button states for this track
    const ratingContainer = document.querySelector(`[data-track-id="${trackId}"]`);
    const buttons = ratingContainer.querySelectorAll('.rating-button');
    
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
    window.location.href = '/albums'
}