/**
 * Enhanced Search Component for DiscogMe
 * Provides autocomplete search functionality with dropdown
 */

class SearchComponent {
    constructor(inputId, dropdownId = null, options = {}) {
        this.searchInput = document.getElementById(inputId);
        this.searchDropdown = dropdownId ? document.getElementById(dropdownId) : this.createDropdown();
        this.dropdownContent = this.searchDropdown.querySelector('.dropdown-content');
        
        this.options = {
            debounceTime: 200,
            minQueryLength: 1,
            maxResults: 8,
            showExactMatch: true,
            enableKeyboard: true,
            ...options
        };
        
        this.searchTimeout = null;
        this.dropdownVisible = false;
        this.selectedIndex = -1;
        this.results = [];
        
        this.init();
    }
    
    createDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown absolute top-full mt-2 w-full bg-spotify-card border border-spotify-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto hidden';
        dropdown.innerHTML = '<div class="dropdown-content py-2"></div>';
        
        // Insert after the search input
        this.searchInput.parentNode.insertBefore(dropdown, this.searchInput.nextSibling);
        return dropdown;
    }
    
    init() {
        this.bindEvents();
        this.setupStyles();
    }
    
    bindEvents() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => this.handleInput(e));
        this.searchInput.addEventListener('focus', (e) => this.handleFocus(e));
        this.searchInput.addEventListener('blur', (e) => this.handleBlur(e));
        
        if (this.options.enableKeyboard) {
            this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        }
        
        // Click outside to close
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Prevent dropdown from closing when clicking inside it
        this.searchDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    
    setupStyles() {
        // Ensure the parent container has relative positioning
        if (getComputedStyle(this.searchInput.parentNode).position === 'static') {
            this.searchInput.parentNode.style.position = 'relative';
        }
    }
    
    handleInput(e) {
        const query = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.selectedIndex = -1;
        
        if (query.length < this.options.minQueryLength) {
            this.hideDropdown();
            return;
        }
        
        this.searchTimeout = setTimeout(() => this.performSearch(query), this.options.debounceTime);
    }
    
    handleFocus(e) {
        const query = e.target.value.trim();
        if (query.length >= this.options.minQueryLength && this.results.length > 0) {
            this.showDropdown();
        }
    }
    
    handleBlur(e) {
        // Delay hiding to allow clicks on dropdown items
        setTimeout(() => {
            if (!this.searchDropdown.contains(document.activeElement)) {
                this.hideDropdown();
            }
        }, 150);
    }
    
    handleKeydown(e) {
        if (!this.dropdownVisible || this.results.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
                this.updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectResult(this.results[this.selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideDropdown();
                this.searchInput.blur();
                break;
        }
    }
    
    handleOutsideClick(e) {
        if (!this.searchInput.contains(e.target) && !this.searchDropdown.contains(e.target)) {
            this.hideDropdown();
        }
    }
    
    async performSearch(query) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${this.options.maxResults}`);
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            this.results = data.artists || [];
            this.displayResults(query);
        } catch (error) {
            console.error('Search error:', error);
            this.hideDropdown();
        }
    }
    
    displayResults(query) {
        if (this.results.length === 0) {
            this.showNoResults();
            return;
        }
        
        const html = this.results.map((artist, index) => this.createResultItem(artist, query, index)).join('');
        this.dropdownContent.innerHTML = html;
        this.showDropdown();
    }
    
    createResultItem(artist, query, index) {
        const image = artist.images?.[0]?.url || '';
        const isExactMatch = this.options.showExactMatch && 
                           artist.name.toLowerCase() === query.toLowerCase();
        
        return `
            <div class="search-result-item flex items-center px-4 py-3 hover:bg-spotify-hover cursor-pointer border-l-4 ${isExactMatch ? 'border-spotify-green bg-spotify-hover' : 'border-transparent'}" 
                 data-index="${index}"
                 onclick="searchComponent.selectResult(${JSON.stringify(artist).replace(/"/g, '&quot;')})">
                ${image ? 
                    `<img src="${image}" alt="${artist.name}" class="w-10 h-10 rounded-full object-cover mr-3">` :
                    `<div class="w-10 h-10 rounded-full bg-spotify-border flex items-center justify-center mr-3 text-sm">🎤</div>`
                }
                <div class="flex-1 min-w-0">
                    <div class="flex items-center">
                        <span class="font-medium text-spotify-text truncate">${this.highlightMatch(artist.name, query)}</span>
                        ${isExactMatch ? '<span class="text-xs bg-spotify-green text-white px-2 py-1 rounded-full ml-2">Match</span>' : ''}
                    </div>
                    <div class="text-sm text-spotify-text-secondary">
                        ${artist.followers?.toLocaleString() || 0} followers
                        ${artist.genres && artist.genres.length > 0 ? ` • ${artist.genres.slice(0, 2).join(', ')}` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-spotify-green bg-opacity-30 text-spotify-text">$1</mark>');
    }
    
    showNoResults() {
        this.dropdownContent.innerHTML = `
            <div class="px-4 py-6 text-center text-spotify-text-secondary">
                <div class="text-2xl mb-2">🔍</div>
                <p>No artists found</p>
                <p class="text-xs mt-1">Try a different search term</p>
            </div>
        `;
        this.showDropdown();
    }
    
    updateSelection() {
        const items = this.dropdownContent.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('bg-spotify-hover');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-spotify-hover');
            }
        });
    }
    
    selectResult(artist) {
        this.hideDropdown();
        this.searchInput.value = '';
        
        // Emit custom event for handling the selection
        const event = new CustomEvent('artistSelected', {
            detail: { artist }
        });
        this.searchInput.dispatchEvent(event);
        
        // Default behavior: navigate to artist page
        if (this.options.onSelect) {
            this.options.onSelect(artist);
        } else {
            window.location.href = `/artist/${artist.id}`;
        }
    }
    
    showDropdown() {
        this.searchDropdown.classList.remove('hidden');
        this.dropdownVisible = true;
    }
    
    hideDropdown() {
        this.searchDropdown.classList.add('hidden');
        this.dropdownVisible = false;
        this.selectedIndex = -1;
    }
    
    // Public methods
    clear() {
        this.searchInput.value = '';
        this.hideDropdown();
        this.results = [];
    }
    
    setQuery(query) {
        this.searchInput.value = query;
        if (query.length >= this.options.minQueryLength) {
            this.performSearch(query);
        }
    }
    
    destroy() {
        clearTimeout(this.searchTimeout);
        this.searchInput.removeEventListener('input', this.handleInput);
        this.searchInput.removeEventListener('focus', this.handleFocus);
        this.searchInput.removeEventListener('blur', this.handleBlur);
        this.searchInput.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('click', this.handleOutsideClick);
        
        if (this.searchDropdown.parentNode) {
            this.searchDropdown.parentNode.removeChild(this.searchDropdown);
        }
    }
}

// Initialize search component when DOM is loaded
let searchComponent;

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchComponent = new SearchComponent('search-input', null, {
            onSelect: (artist) => {
                // Custom handler can be defined per page
                if (window.handleArtistSelect) {
                    window.handleArtistSelect(artist);
                } else {
                    window.location.href = `/artist/${artist.id}`;
                }
            }
        });
    }
});
