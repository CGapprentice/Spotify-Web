/**
 * Global Search Functionality
 * Handles navbar search with dropdown suggestions
 */

class GlobalSearch {
    constructor() {
        this.searchInput = null;
        this.searchForm = null;
        this.dropdownElement = null;
        this.searchTimeout = null;
        this.isDropdownVisible = false;
        this.selectedIndex = -1;
        this.results = [];
        
        this.init();
    }
    
    init() {
        // Find search input (works with different implementations)
        this.searchInput = document.querySelector('input[name="q"], #search-input, .search-input');
        this.searchForm = this.searchInput?.closest('form');
        
        if (!this.searchInput) return;
        
        this.createDropdown();
        this.bindEvents();
        this.enhanceInput();
    }
    
    createDropdown() {
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.id = 'global-search-dropdown';
        this.dropdownElement.className = 'absolute top-full mt-2 w-full bg-spotify-card border border-spotify-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto hidden';
        this.dropdownElement.innerHTML = '<div class="dropdown-content py-2"></div>';
        
        // Ensure parent has relative positioning
        const parent = this.searchInput.parentElement;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        
        parent.appendChild(this.dropdownElement);
    }
    
    enhanceInput() {
        // Update input styles for better UX
        this.searchInput.setAttribute('autocomplete', 'off');
        this.searchInput.setAttribute('spellcheck', 'false');
        
        // Add Spotify-style classes if not already present
        if (!this.searchInput.className.includes('bg-spotify')) {
            this.searchInput.className += ' bg-spotify-hover border border-spotify-border rounded-full px-4 py-2 text-spotify-text placeholder-spotify-text-secondary focus:outline-none focus:border-spotify-green transition-colors';
        }
    }
    
    bindEvents() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => this.handleInput(e));
        this.searchInput.addEventListener('focus', (e) => this.handleFocus(e));
        this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Form submission
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.dropdownElement.contains(e.target)) {
                this.hideDropdown();
            }
        });
        
        // Prevent dropdown from closing when clicking inside
        this.dropdownElement.addEventListener('click', (e) => e.stopPropagation());
    }
    
    handleInput(e) {
        const query = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.selectedIndex = -1;
        
        if (query.length === 0) {
            this.hideDropdown();
            return;
        }
        
        if (query.length >= 1) {
            this.searchTimeout = setTimeout(() => this.performSearch(query), 150);
        }
    }
    
    handleFocus(e) {
        const query = e.target.value.trim();
        if (query.length >= 1 && this.results.length > 0) {
            this.showDropdown();
        }
    }
    
    handleKeydown(e) {
        if (!this.isDropdownVisible || this.results.length === 0) {
            if (e.key === 'Enter' && this.searchForm) {
                return; // Let form submit naturally
            }
            return;
        }
        
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
                    this.selectArtist(this.results[this.selectedIndex]);
                } else if (this.searchForm) {
                    // No selection, use form submission
                    window.location.href = `/search?q=${encodeURIComponent(this.searchInput.value.trim())}`;
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideDropdown();
                break;
        }
    }
    
    handleSubmit(e) {
        // If an item is selected, go to artist page instead
        if (this.selectedIndex >= 0) {
            e.preventDefault();
            this.selectArtist(this.results[this.selectedIndex]);
        }
        // Otherwise, let the form submit to /search
    }
    
    async performSearch(query) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
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
        const dropdownContent = this.dropdownElement.querySelector('.dropdown-content');
        
        if (this.results.length === 0) {
            dropdownContent.innerHTML = `
                <div class="px-4 py-6 text-center">
                    <div class="text-spotify-text-secondary">
                        <div class="text-2xl mb-2">🔍</div>
                        <p class="font-medium">No artists found</p>
                        <p class="text-sm mt-1">Press Enter to search albums and more</p>
                    </div>
                </div>
            `;
            this.showDropdown();
            return;
        }
        
        const html = this.results.map((artist, index) => this.createResultItem(artist, query, index)).join('');
        
        // Add "See all results" option at the bottom
        const seeAllHtml = `
            <div class="border-t border-spotify-border mt-2 pt-2">
                <div class="search-result-item px-4 py-3 hover:bg-spotify-hover cursor-pointer text-center text-spotify-green font-medium" 
                     onclick="globalSearch.searchAll('${query.replace(/'/g, "\\'")}')">
                    🔍 See all results for "${query}"
                </div>
            </div>
        `;
        
        dropdownContent.innerHTML = html + seeAllHtml;
        this.showDropdown();
    }
    
    createResultItem(artist, query, index) {
        const image = artist.images?.[0]?.url || '';
        const isExactMatch = artist.name.toLowerCase() === query.toLowerCase();
        
        return `
            <div class="search-result-item flex items-center px-4 py-3 hover:bg-spotify-hover cursor-pointer border-l-4 ${isExactMatch ? 'border-spotify-green bg-spotify-hover' : 'border-transparent'}" 
                 data-index="${index}"
                 onclick="globalSearch.selectArtist(${JSON.stringify(artist).replace(/"/g, '&quot;')})">
                ${image ? 
                    `<img src="${image}" alt="${artist.name}" class="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0">` :
                    `<div class="w-10 h-10 rounded-full bg-spotify-border flex items-center justify-center mr-3 text-sm flex-shrink-0">🎤</div>`
                }
                <div class="flex-1 min-w-0">
                    <div class="flex items-center">
                        <span class="font-medium text-spotify-text truncate">${this.highlightMatch(artist.name, query)}</span>
                        ${isExactMatch ? '<span class="text-xs bg-spotify-green text-white px-2 py-1 rounded-full ml-2 flex-shrink-0">Exact</span>' : ''}
                    </div>
                    <div class="text-sm text-spotify-text-secondary truncate">
                        ${artist.followers?.toLocaleString() || '0'} followers
                        ${artist.genres?.length > 0 ? ` • ${artist.genres.slice(0, 1).join(', ')}` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="bg-spotify-green bg-opacity-30 text-spotify-text font-semibold">$1</span>');
    }
    
    updateSelection() {
        const items = this.dropdownElement.querySelectorAll('.search-result-item[data-index]');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('bg-spotify-hover');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-spotify-hover');
            }
        });
    }
    
    selectArtist(artist) {
        this.hideDropdown();
        this.searchInput.value = '';
        
        // Navigate to artist page
        window.location.href = `/artist/${artist.id}`;
    }
    
    searchAll(query) {
        this.hideDropdown();
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
    
    showDropdown() {
        this.dropdownElement.classList.remove('hidden');
        this.isDropdownVisible = true;
    }
    
    hideDropdown() {
        this.dropdownElement.classList.add('hidden');
        this.isDropdownVisible = false;
        this.selectedIndex = -1;
    }
}

// Initialize global search
let globalSearch;

document.addEventListener('DOMContentLoaded', function() {
    globalSearch = new GlobalSearch();
});
