let allAlbums = [];
let currentPage = 1;
const albumsPerPage = 30;

document.addEventListener('DOMContentLoaded', function() {
    fetchSavedAlbums();
});

function fetchSavedAlbums() {
    const container = document.getElementById('albums-container');
    container.innerHTML = '<div class="loading">Loading your albums...</div>';
    
    fetch('/api/saved-albums')
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    throw new Error('Please log in to view your albums');
                }
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message || 'Error fetching albums');
            }
            allAlbums = data.items || [];
            currentPage = 1;
            displayAlbumPage(currentPage);
        })
        .catch(error => {
            container.innerHTML = 
                `<div class="text-center py-16">
                    <p class="text-red-400 text-lg mb-4">Error loading albums: ${error.message}</p>
                    <p class="text-gray-400">Please try again or login first.</p>
                </div>`;
            console.error('Error fetching albums:', error);
        });
}

function displayAlbumPage(page) {
    const container = document.getElementById('albums-container');
    container.innerHTML = '';
    
    if (!allAlbums || allAlbums.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">🎵</div>
                <h3 class="text-xl font-semibold text-white mb-2">No saved albums found</h3>
                <p class="text-gray-400">Start saving albums on Spotify to see them here!</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (page - 1) * albumsPerPage;
    const endIndex = Math.min(startIndex + albumsPerPage, allAlbums.length);
    const currentAlbums = allAlbums.slice(startIndex, endIndex);
    
    // Albums info header
    const infoElement = document.createElement('div');
    infoElement.className = 'flex justify-between items-center mb-6';
    infoElement.innerHTML = `
        <p class="text-gray-400 font-medium">
            Showing ${startIndex + 1}-${endIndex} of ${allAlbums.length} albums
        </p>
        <div class="flex items-center gap-2 text-gray-400 text-sm">
            <span>Sort by:</span>
            <select class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 text-white">
                <option>Recently Added</option>
                <option>Alphabetical</option>
                <option>Artist</option>
            </select>
        </div>
    `;
    container.appendChild(infoElement);
    
    // Album grid
    const albumGrid = document.createElement('div');
    albumGrid.className = 'album-grid';
    
    currentAlbums.forEach(item => {
        const album = item.album;
        const albumElement = document.createElement('div');
        albumElement.className = 'album-card group';
        
        const imageUrl = album.images && album.images.length > 0 
            ? album.images[0].url 
            : 'placeholder.jpg';
            
        const artistNames = album.artists
            .map(artist => artist.name)
            .join(', ');
        
        const releaseDate = album.release_date || 'Unknown date';
        const releaseYear = releaseDate.split('-')[0];
            
        albumElement.innerHTML = `
            <div class="relative overflow-hidden">
                <img src="${imageUrl}" alt="${album.name}" class="album-cover">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                        <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="flex-1 min-h-0">
                <h3 class="album-title">${album.name}</h3>
                <p class="album-artist">${artistNames}</p>
                <p class="album-date">${releaseYear}</p>
            </div>
        `;
        
        albumElement.addEventListener('click', () => {
            sessionStorage.setItem('selectedAlbum', JSON.stringify(album));
            window.location.href = '/album-songs';
        });
        
        albumGrid.appendChild(albumElement);
    });
    
    container.appendChild(albumGrid);
    
    // Pagination
    const totalPages = Math.ceil(allAlbums.length / albumsPerPage);
    
    if (totalPages > 1) {
        const paginationElement = document.createElement('div');
        paginationElement.className = 'pagination';
        
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-btn ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`;
        prevButton.textContent = '← Previous';
        prevButton.disabled = page <= 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayAlbumPage(currentPage);
                container.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        const pageIndicator = document.createElement('span');
        pageIndicator.className = 'page-info';
        pageIndicator.textContent = `Page ${page} of ${totalPages}`;
        
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-btn ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`;
        nextButton.textContent = 'Next →';
        nextButton.disabled = page >= totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayAlbumPage(currentPage);
                container.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        paginationElement.appendChild(prevButton);
        paginationElement.appendChild(pageIndicator);
        paginationElement.appendChild(nextButton);
        
        container.appendChild(paginationElement);
    }
}