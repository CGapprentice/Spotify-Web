let allAlbums = [];
let currentPage = 1;
const albumsPerPage = 30;

// Fetch albums when page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchSavedAlbums();
});

function fetchSavedAlbums() {
    document.getElementById('albums-container').innerHTML = '<p>Loading your albums...</p>';
    
    // Fetch saved albums from backend
    fetch('/saved-albums')
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
            // Store all albums globally
            allAlbums = data.items || [];
            // Reset to first page
            currentPage = 1;
            // Display albums with pagination
            displayAlbumPage(currentPage);
        })
        .catch(error => {
            document.getElementById('albums-container').innerHTML = 
                `<p>Error loading albums: ${error.message}. Please try again or login first.</p>`;
            console.error('Error fetching albums:', error);
        });
}

function displayAlbumPage(page) {
    const container = document.getElementById('albums-container');
    
    container.innerHTML = '';
    
    // Check if we have albums to display
    if (!allAlbums || allAlbums.length === 0) {
        container.innerHTML = '<p>No saved albums found in your library.</p>';
        return;
    }
    
    const startIndex = (page - 1) * albumsPerPage;
    const endIndex = Math.min(startIndex + albumsPerPage, allAlbums.length);
    const currentAlbums = allAlbums.slice(startIndex, endIndex);
    
    // Display total count and page info
    const infoElement = document.createElement('div');
    infoElement.className = 'albums-info';
    infoElement.innerHTML = `
        <p>Showing ${startIndex + 1}-${endIndex} of ${allAlbums.length} albums</p>
    `;
    container.appendChild(infoElement);
    
    // Create a grid to display albums
    const albumGrid = document.createElement('div');
    albumGrid.className = 'album-grid';
    
    // Add each album to the grid
    currentAlbums.forEach(item => {
        const album = item.album;
        const albumElement = document.createElement('div');
        albumElement.className = 'album-card';
        
        const imageUrl = album.images && album.images.length > 0 
            ? album.images[0].url 
            : 'placeholder.jpg';
            
        const artistNames = album.artists
            .map(artist => artist.name)
            .join(', ');
        
        const releaseDate = album.release_date || 'Unknown date';
            
        albumElement.innerHTML = `
            <img src="${imageUrl}" alt="${album.name}" class="album-cover">
            <div class="album-info">
                <h3>${album.name}</h3>
                <p class="artist">${artistNames}</p>
                <p class="release-date">${releaseDate}</p>
            </div>
        `;
        
        // Add click handler to open album and list songs
        albumElement.addEventListener('click', () => {
            sessionStorage.setItem('selectedAlbum', JSON.stringify(album));
            window.location.href = '/album-songs';
        });
        albumElement.style.cursor = 'pointer';
        albumGrid.appendChild(albumElement);
    
    });
    
    container.appendChild(albumGrid);
    
    const paginationElement = document.createElement('div');
    paginationElement.className = 'pagination';
    
    const totalPages = Math.ceil(allAlbums.length / albumsPerPage);
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = page <= 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayAlbumPage(currentPage);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = page >= totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayAlbumPage(currentPage);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    pageIndicator.className = 'page-indicator';
    
    paginationElement.appendChild(prevButton);
    paginationElement.appendChild(pageIndicator);
    paginationElement.appendChild(nextButton);
    
    container.appendChild(paginationElement);
}