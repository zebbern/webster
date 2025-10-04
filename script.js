document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('urlInput');
    const runButton = document.getElementById('runButton');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const viewImagesButton = document.getElementById('viewImagesButton');

    let currentResults = [];
    let currentImages = [];
    let starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
    
    // Load starred items on page load
    loadStarredItems();
    
    // Restore previous results if available
    const savedResults = localStorage.getItem('currentResults');
    const savedUrl = localStorage.getItem('currentUrl');
    if (savedResults && savedUrl) {
        currentResults = JSON.parse(savedResults);
        urlInput.value = savedUrl;
        currentImages = currentResults.filter(item => item.type === 'IMAGE');
        displayResults(currentResults);
        if (currentImages.length > 0) {
            viewImagesButton.classList.remove('hidden');
        }
    }

    // Check for autoExtract parameter
    const urlParams = new URLSearchParams(window.location.search);
    const autoExtractUrl = urlParams.get('autoExtract');
    if (autoExtractUrl) {
        urlInput.value = autoExtractUrl;
        setTimeout(() => {
            extractContent(autoExtractUrl);
        }, 100);
    }

    runButton.addEventListener('click', function() {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please enter a URL');
            return;
        }

        if (!isValidUrl(url)) {
            showError('Please enter a valid URL');
            return;
        }

        extractContent(url);
    });

    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runButton.click();
        }
    });

    viewImagesButton.addEventListener('click', function() {
        localStorage.setItem('extractedImages', JSON.stringify(currentImages));
        window.location.href = 'images.html';
    });

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        error.classList.remove('hidden');
        results.classList.add('hidden');
        loading.classList.add('hidden');
    }

    function hideError() {
        error.classList.add('hidden');
    }

    function showLoading() {
        loading.classList.remove('hidden');
        results.classList.add('hidden');
        hideError();
        runButton.disabled = true;
        runButton.textContent = 'Running...';
    }

    function hideLoading() {
        loading.classList.add('hidden');
        runButton.disabled = false;
        runButton.textContent = 'Run';
    }

    async function extractContent(url) {
        showLoading();

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract content');
            }

            currentResults = data.results;
            currentImages = data.results.filter(item => item.type === 'IMAGE');
            
            // Save results and URL to localStorage for restoration
            localStorage.setItem('currentResults', JSON.stringify(currentResults));
            localStorage.setItem('currentUrl', url);
            
            // Update starred items with new navigation from this page
            updateStarredItemsFromNewPage(data.results);
            
            displayResults(data.results);
            
        } catch (err) {
            console.error('Extraction error:', err);
            showError(err.message || 'Failed to extract content. Please try again.');
        } finally {
            hideLoading();
        }
    }

    function displayResults(resultsData) {
        hideError();
        results.classList.remove('hidden');

        // Show/hide view images button
        const hasImages = resultsData.some(item => item.type === 'IMAGE');
        if (hasImages) {
            viewImagesButton.classList.remove('hidden');
        } else {
            viewImagesButton.classList.add('hidden');
        }

        // Categorize results
        const categories = categorizeResults(resultsData);
        
        // Display each category
        displayCategory('images-category', categories.images, 'image');
        displayCategory('navigation-category', categories.navigation, 'navigation');
        displayCategory('buttons-category', categories.buttons, 'button');
        displayCategory('forms-category', categories.forms, 'form');
        displayCategory('data-category', categories.data, 'data');
        displayCategory('other-category', categories.other, 'other');

        // Update result counts
        updateResultCount('images-count', categories.images.length);
        updateResultCount('navigation-count', categories.navigation.length);
        updateResultCount('buttons-count', categories.buttons.length);
        updateResultCount('forms-count', categories.forms.length);
        updateResultCount('data-count', categories.data.length);
        updateResultCount('other-count', categories.other.length);
    }

    function updateResultCount(countElementId, count) {
        const countElement = document.getElementById(countElementId);
        if (countElement) {
            countElement.textContent = `(${count})`;
        }
    }

    function categorizeResults(results) {
        const categories = {
            images: [],
            navigation: [],
            buttons: [],
            forms: [],
            data: [],
            other: []
        };

        results.forEach(item => {
            if (item.type === 'IMAGE') {
                categories.images.push(item);
            } else if (item.type === 'INTERACTIVE') {
                if (isNavigationElement(item)) {
                    categories.navigation.push(item);
                } else if (isButtonElement(item)) {
                    categories.buttons.push(item);
                } else if (isFormElement(item)) {
                    categories.forms.push(item);
                } else if (hasDataAttributes(item)) {
                    categories.data.push(item);
                } else {
                    categories.other.push(item);
                }
            } else {
                categories.other.push(item);
            }
        });

        return categories;
    }

    function isNavigationElement(item) {
        const text = item.text.toLowerCase();
        const href = item.href.toLowerCase();
        const className = item.className.toLowerCase();
        
        const navKeywords = ['next', 'prev', 'previous', 'chapter', 'page', 'continue', 'back', 'forward', 'navigate'];
        
        return navKeywords.some(keyword => 
            text.includes(keyword) || 
            href.includes(keyword) || 
            className.includes(keyword)
        ) || (item.tag === 'a' && item.href);
    }

    function isButtonElement(item) {
        return item.tag === 'button' || 
               item.className.includes('btn') || 
               item.className.includes('button') || 
               item.onclick;
    }

    function isFormElement(item) {
        return ['input', 'select', 'textarea'].includes(item.tag);
    }

    function hasDataAttributes(item) {
        return item.allAttributes && Object.keys(item.allAttributes).some(attr => attr.startsWith('data-'));
    }

    function displayCategory(containerId, items, categoryType) {
        const container = document.getElementById(containerId);
        const filterId = containerId.replace('-category', '-filter');
        const filterInput = document.getElementById(filterId);
        
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p style="color: #888; font-style: italic;">No items found</p>';
            return;
        }

        // Store original items for filtering
        container.originalItems = items;
        container.categoryType = categoryType;

        // Add filter event listener
        if (filterInput && !filterInput.hasEventListener) {
            filterInput.hasEventListener = true;
            filterInput.addEventListener('input', function() {
                filterCategory(containerId, this.value.toLowerCase());
            });
        }

        // Display all items initially
        items.forEach(item => {
            const element = createResultElement(item, categoryType);
            container.appendChild(element);
        });
    }

    function handleStarClick(item, button, event) {
        event.stopPropagation();
        
        const customName = prompt('Enter a custom name for this starred item:', 
            item.text || item.title || item.href || 'Starred Item');
        
        if (customName === null) return; // User cancelled
        
        const starredItem = {
            id: Date.now(),
            name: customName,
            originalItem: item,
            customPrefix: '', // Individual prefix for this item
            timestamp: new Date().toISOString()
        };
        
        starredItems.push(starredItem);
        localStorage.setItem('starredItems', JSON.stringify(starredItems));
        
        button.classList.add('starred');
        button.title = `Starred as: ${customName}`;
        
        // Refresh starred items display
        loadStarredItems();
    }

    function isItemStarred(item) {
        return starredItems.some(starred => 
            starred.originalItem.href === item.href && 
            starred.originalItem.text === item.text
        );
    }

    function filterCategory(containerId, filterText) {
        const container = document.getElementById(containerId);
        const items = container.originalItems || [];
        
        container.innerHTML = '';

        const filteredItems = items.filter(item => {
            const searchText = (
                (item.text || '') + ' ' +
                (item.href || '') + ' ' + 
                (item.title || '') + ' ' +
                (item.className || '') + ' ' +
                (item.url || '') + ' ' +
                (item.format || '')
            ).toLowerCase();
            
            return searchText.includes(filterText);
        });

        if (filteredItems.length === 0) {
            container.innerHTML = '<p style="color: #888; font-style: italic;">No items match filter</p>';
            // Update result count for this category
            const categoryName = containerId.replace('-category', '');
            const countElementId = categoryName + '-count';
            updateResultCount(countElementId, 0);
            return;
        }

        filteredItems.forEach(item => {
            const element = createResultElement(item, container.categoryType);
            container.appendChild(element);
        });

        // Update result count for this category
        const categoryName = containerId.replace('-category', '');
        const countElementId = categoryName + '-count';
        updateResultCount(countElementId, filteredItems.length);
    }

    function createResultElement(item, categoryType) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        // Check if item has clickable URL or useful action
        const hasClickableUrl = item.href && item.href.startsWith('http');
        const hasAction = item.onclick || item.href;
        
        if (hasClickableUrl) {
            div.classList.add('clickable');
            div.addEventListener('click', () => handleResultClick(item));
        } else if (hasAction && !hasClickableUrl) {
            div.classList.add('has-action');
            div.title = 'This element has an action but no direct URL';
        }

        let content = '';

        if (item.type === 'IMAGE') {
            content = `
                <div class="result-text">Image: ${item.format.toUpperCase()}</div>
                <div class="result-details">
                    <strong>URL:</strong> ${truncateUrl(item.url)}
                </div>
            `;
        } else if (item.type === 'INTERACTIVE') {
            // Create better display based on element type
            let displayText = item.text ? truncateText(item.text) : (item.value || item.placeholder || 'No text');
            let elementType = item.tag.toUpperCase();
            
            // Enhanced display for different types
            if (item.tag === 'button') {
                elementType = 'BUTTON';
            } else if (item.tag === 'a') {
                elementType = 'LINK';
            } else if (['input', 'select', 'textarea'].includes(item.tag)) {
                elementType = `FORM ${item.tag.toUpperCase()}`;
            }

            content = `
                <div class="result-text">${elementType}: ${displayText}</div>
                <div class="result-details">
                    ${item.href ? `<strong>URL:</strong> ${truncateUrl(item.href)}<br>` : ''}
                    ${item.title ? `<strong>Title:</strong> ${truncateText(item.title)}<br>` : ''}
                    ${item.onclick ? `<strong>OnClick:</strong> ${truncateText(item.onclick, 60)}<br>` : ''}
                    ${item.value ? `<strong>Value:</strong> ${truncateText(item.value)}<br>` : ''}
                    ${item.placeholder ? `<strong>Placeholder:</strong> ${truncateText(item.placeholder)}<br>` : ''}
                    ${item.id ? `<strong>ID:</strong> ${item.id}<br>` : ''}
                    ${item.className ? `<strong>CSS Classes:</strong> ${truncateText(item.className, 80)}<br>` : ''}
                    ${getDataAttributes(item)}
                    ${item.tag ? `<strong>HTML Tag:</strong> &lt;${item.tag}&gt;<br>` : ''}
                </div>
            `;
        }

        div.innerHTML = content;
        
        // Create wrapper for interactive items with star button
        if (item.type === 'INTERACTIVE') {
            const wrapper = document.createElement('div');
            wrapper.className = 'result-wrapper';
            
            const starButton = document.createElement('button');
            starButton.className = 'star-button';
            starButton.innerHTML = '★';
            starButton.title = 'Star this item';
            
            if (isItemStarred(item)) {
                starButton.classList.add('starred');
            }
            
            starButton.addEventListener('click', (e) => handleStarClick(item, starButton, e));
            
            // Put both the result div and star button in wrapper
            wrapper.appendChild(div);
            wrapper.appendChild(starButton);
            
            return wrapper;
        }
        
        return div;
    }

    function getDataAttributes(item) {
        if (!item.allAttributes) return '';
        
        const dataAttrs = Object.keys(item.allAttributes)
            .filter(attr => attr.startsWith('data-'))
            .map(attr => `<strong>${attr}:</strong> ${truncateText(item.allAttributes[attr])}`)
            .join('<br>');
            
        return dataAttrs;
    }

    function truncateText(text, maxLength = 50) {
        if (!text) return '';
        return text;
    }

    function truncateUrl(url, maxLength = 60) {
        if (!url) return '';
        return url;
    }

    function updateStarredItemsFromNewPage(newResults) {
        starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
        let updated = false;
        
        starredItems.forEach(starredItem => {
            const matchingItem = findMatchingNavigationItem(starredItem, newResults);
            if (matchingItem) {
                starredItem.originalItem.href = matchingItem.href;
                updated = true;
                console.log(`Updated "${starredItem.name}" to new URL: ${matchingItem.href}`);
            }
        });
        
        if (updated) {
            localStorage.setItem('starredItems', JSON.stringify(starredItems));
            loadStarredItems();
        }
    }
    
    function findMatchingNavigationItem(starredItem, newResults) {
        const original = starredItem.originalItem;
        let bestMatch = null;
        let bestScore = 0;
        
        newResults.forEach(item => {
            if (item.type !== 'INTERACTIVE' || !item.href) return;
            
            let score = 0;
            
            // Match by title (highest priority)
            if (original.title && item.title && 
                original.title.toLowerCase() === item.title.toLowerCase()) {
                score += 10;
            } else if (original.title && item.title && 
                       item.title.toLowerCase().includes(original.title.toLowerCase())) {
                score += 5;
            }
            
            // Match by CSS classes (very important)
            if (original.className && item.className) {
                const originalClasses = original.className.toLowerCase().split(' ');
                const itemClasses = item.className.toLowerCase().split(' ');
                
                originalClasses.forEach(cls => {
                    if (itemClasses.includes(cls)) {
                        score += 8; // High score for class matches
                    }
                });
            }
            
            // Match by text content
            if (original.text && item.text &&
                original.text.toLowerCase() === item.text.toLowerCase()) {
                score += 7;
            } else if (original.text && item.text &&
                       item.text.toLowerCase().includes(original.text.toLowerCase())) {
                score += 3;
            }
            
            // Match by ID
            if (original.id && item.id && original.id === item.id) {
                score += 6;
            }
            
            // Match by tag type
            if (original.tag && item.tag && original.tag === item.tag) {
                score += 2;
            }
            
            // Match by data attributes
            if (original.allAttributes && item.allAttributes) {
                Object.keys(original.allAttributes).forEach(attr => {
                    if (attr.startsWith('data-') && 
                        item.allAttributes[attr] === original.allAttributes[attr]) {
                        score += 4;
                    }
                });
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = item;
            }
        });
        
        // Only return match if score is high enough
        return bestScore >= 5 ? bestMatch : null;
    }

    function handleResultClick(item) {
        if (item.href && item.href.startsWith('http')) {
            urlInput.value = item.href;
            extractContent(item.href);
        }
    }

    function loadStarredItems() {
        const starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
        const starredFilters = document.getElementById('starredFilters');
        const starredButtons = document.getElementById('starredButtons');
        const starredList = document.getElementById('starredList');
        
        if (!starredFilters) return; // Element doesn't exist on this page
        
        starredButtons.innerHTML = '';
        starredList.innerHTML = '';
        
        if (starredItems.length > 0) {
            starredFilters.style.display = 'block';
            
            starredItems.forEach((item, index) => {
                // Create navigation button for all items (handle URLs appropriately)
                const button = document.createElement('button');
                button.className = 'starred-btn';
                button.textContent = item.name;
                
                // Always create a functional button using prefix + URL value
                const activePrefix = item.customPrefix || '';
                let targetUrl = '';
                
                if (item.originalItem.href) {
                    if (activePrefix) {
                        // If there's a prefix, replace the domain with the prefix
                        if (item.originalItem.href.startsWith('http')) {
                            const url = new URL(item.originalItem.href);
                            targetUrl = `${activePrefix}${url.pathname}${url.search}${url.hash}`;
                        } else {
                            // If the href doesn't start with http, treat it as a path
                            targetUrl = `${activePrefix}${item.originalItem.href}`;
                        }
                    } else {
                        // No prefix, use original URL
                        targetUrl = item.originalItem.href;
                    }
                } else if (activePrefix) {
                    // No original URL but has prefix - create a base URL
                    targetUrl = `${activePrefix}/`;
                }
                
                if (targetUrl) {
                    button.title = `Click to navigate to: ${targetUrl}`;
                    button.addEventListener('click', async () => {
                        urlInput.value = targetUrl;
                        extractContent(targetUrl);
                    });
                } else {
                    // No URL and no prefix
                    button.title = `This item needs a URL or prefix to navigate`;
                    button.style.opacity = '0.6';
                    button.addEventListener('click', () => {
                        alert(`"${item.name}" needs either a URL or a prefix to navigate. Set a prefix in "Manage Favorites".`);
                    });
                }
                
                starredButtons.appendChild(button);
                
                // Create management item
                const listItem = document.createElement('div');
                listItem.className = 'starred-item';
                
                const itemInfo = document.createElement('div');
                itemInfo.className = 'starred-item-info';
                
                const itemName = document.createElement('div');
                itemName.className = 'starred-item-name';
                itemName.textContent = item.name;
                
                const itemUrl = document.createElement('div');
                itemUrl.className = 'starred-item-url';
                
                // Show the URL with prefix applied if it exists, otherwise show original href or 'No URL'
                let displayUrl = item.originalItem.href || 'No URL';
                if (item.originalItem.href && item.customPrefix) {
                    if (item.originalItem.href.startsWith('http')) {
                        const url = new URL(item.originalItem.href);
                        displayUrl = `${item.customPrefix}${url.pathname}${url.search}${url.hash}`;
                    } else {
                        displayUrl = `${item.customPrefix}${item.originalItem.href}`;
                    }
                }
                itemUrl.textContent = displayUrl;
                
                itemInfo.appendChild(itemName);
                itemInfo.appendChild(itemUrl);
                
                const itemActions = document.createElement('div');
                itemActions.className = 'starred-item-actions';
                
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    const newName = prompt('Enter new name:', item.name);
                    if (newName !== null && newName !== item.name) {
                        const starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
                        const itemIndex = starredItems.findIndex(si => si.id === item.id);
                        if (itemIndex !== -1) {
                            starredItems[itemIndex].name = newName;
                            localStorage.setItem('starredItems', JSON.stringify(starredItems));
                            loadStarredItems();
                        }
                    }
                });

                const editPrefixBtn = document.createElement('button');
                editPrefixBtn.className = 'edit-btn';
                editPrefixBtn.textContent = 'Set Prefix';
                editPrefixBtn.style.marginLeft = '5px';
                editPrefixBtn.addEventListener('click', () => {
                    const currentPrefix = item.customPrefix !== undefined ? item.customPrefix : '';
                    const newPrefix = prompt('Enter custom prefix for this item (will override global prefix):\nExample: "example.com" will make URL become "https://example.com/path"\nLeave empty to use global prefix:', currentPrefix);
                    if (newPrefix !== null && newPrefix !== currentPrefix) {
                        const starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
                        const itemIndex = starredItems.findIndex(si => si.id === item.id);
                        if (itemIndex !== -1) {
                            starredItems[itemIndex].customPrefix = newPrefix;
                            localStorage.setItem('starredItems', JSON.stringify(starredItems));
                            loadStarredItems();
                        }
                    }
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Delete "${item.name}"?`)) {
                        const starredItems = JSON.parse(localStorage.getItem('starredItems') || '[]');
                        const filteredItems = starredItems.filter(si => si.id !== item.id);
                        localStorage.setItem('starredItems', JSON.stringify(filteredItems));
                        loadStarredItems();
                    }
                });
                
                itemActions.appendChild(editBtn);
                itemActions.appendChild(editPrefixBtn);
                itemActions.appendChild(deleteBtn);
                
                listItem.appendChild(itemInfo);
                listItem.appendChild(itemActions);
                starredList.appendChild(listItem);
            });
        } else {
            // Show section but indicate no starred items
            starredFilters.style.display = 'block';
            starredList.innerHTML = '';
        }
    }

    // Quick filter functionality for Navigation Links
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-filter-btn')) {
            // Remove active class from all navigation filter buttons
            document.querySelectorAll('.quick-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            e.target.classList.add('active');
            
            const filterTerm = e.target.dataset.filter.toLowerCase();
            // Use the same filtering logic as the search filter
            filterCategory('navigation-category', filterTerm);
        }
        
        // Quick filter functionality for Images
        if (e.target.classList.contains('image-filter-btn')) {
            // Remove active class from all image filter buttons
            document.querySelectorAll('.image-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            e.target.classList.add('active');
            
            const filterFormat = e.target.dataset.format.toLowerCase();
            // Use the same filtering logic as the search filter
            filterCategory('images-category', filterFormat);
        }
    });
});