// Global variables for pagination
let allAlbums = [];
let currentPage = 1;
const albumsPerPage = 20;

function fetchSavedAlbums() {
    // Show loading indicator
    document.getElementById('albums-container').innerHTML = '<p>Loading your albums...</p>';
    
    // Fetch saved albums from your backend
    fetch('/saved-albums')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message || 'Error fetching albums');
            }
            // Store all albums globally
            allAlbums = data.items;
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
    
    // Clear container
    container.innerHTML = '';
    
    // Calculate start and end indices for current page
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
        
        // Get album cover (use first image or a placeholder)
        const imageUrl = album.images && album.images.length > 0 
            ? album.images[0].url 
            : 'placeholder.jpg';
            
        // Get artist names
        const artistNames = album.artists
            .map(artist => artist.name)
            .join(', ');
        
        // Get release date
        const releaseDate = album.release_date || 'Unknown date';
            
        albumElement.innerHTML = `
            <img src="${imageUrl}" alt="${album.name}" class="album-cover">
            <div class="album-info">
                <h3>${album.name}</h3>
                <p class="artist">${artistNames}</p>
                <p class="release-date">${releaseDate}</p>
            </div>
        `;
        
        // Add click handler to open album in Spotify
        if (album.external_urls && album.external_urls.spotify) {
            albumElement.addEventListener('click', () => {
                window.open(album.external_urls.spotify, '_blank');
            });
            albumElement.style.cursor = 'pointer';
        }
        
        albumGrid.appendChild(albumElement);
    });
    
    container.appendChild(albumGrid);
    
    // Add pagination controls
    const paginationElement = document.createElement('div');
    paginationElement.className = 'pagination';
    
    // Calculate total pages
    const totalPages = Math.ceil(allAlbums.length / albumsPerPage);
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = page <= 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayAlbumPage(currentPage);
            // Scroll to top of container
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
            // Scroll to top of container
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