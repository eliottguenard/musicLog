// État de l'application
let albums = [];
let albumsLoaded = false;
let currentRating = 0;
let editingAlbumId = null;
let importedData = null;

// Configuration GitHub pour sauvegarder albums.json
const GITHUB_CONFIG = {
    owner: 'eliottguenard',
    repo: 'musicLog',
    path: 'albums.json',
    branch: 'main'
};

// Récupérer ou demander le token GitHub
function getGitHubToken() {
    let token = localStorage.getItem('github-token');
    if (!token) {
        token = prompt(
            'Pour sauvegarder vos albums sur GitHub, entrez votre Personal Access Token:\n\n' +
            '1. Allez sur github.com/settings/tokens\n' +
            '2. Cliquez "Generate new token (classic)"\n' +
            '3. Cochez "repo" et générez\n' +
            '4. Collez le token ici:'
        );
        if (token) {
            localStorage.setItem('github-token', token.trim());
        }
    }
    return token;
}

// Sauvegarder albums.json sur GitHub
async function saveToGitHub() {
    const token = getGitHubToken();
    if (!token) {
        console.warn('Pas de token GitHub, sauvegarde locale uniquement');
        return false;
    }

    try {
        // Récupérer le SHA actuel du fichier
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        let sha = null;
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }

        // Encoder le contenu en base64
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(albums, null, 2))));

        // Mettre à jour le fichier
        const updateResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update albums.json - ${new Date().toLocaleString('fr-FR')}`,
                    content: content,
                    sha: sha,
                    branch: GITHUB_CONFIG.branch
                })
            }
        );

        if (updateResponse.ok) {
            console.log('✅ Albums sauvegardés sur GitHub');
            return true;
        } else {
            const error = await updateResponse.json();
            console.error('Erreur GitHub:', error);
            if (updateResponse.status === 401) {
                localStorage.removeItem('github-token');
                showToast('Token invalide, veuillez réessayer', 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde GitHub:', error);
        return false;
    }
}

// Charger les albums depuis le fichier JSON
async function loadAlbumsFromJSON() {
    try {
        const response = await fetch('albums.json');
        if (response.ok) {
            const jsonAlbums = await response.json();
            if (jsonAlbums && jsonAlbums.length > 0) {
                albums = jsonAlbums;
                console.log(`${albums.length} albums chargés depuis albums.json`);
            }
        }
    } catch (error) {
        console.warn('Impossible de charger albums.json, utilisation du localStorage:', error);
        // Fallback sur localStorage si le fichier JSON n'existe pas ou erreur
        albums = JSON.parse(localStorage.getItem('musiclog-albums')) || [];
    }
    albumsLoaded = true;
}

// Fonction pour obtenir l'URL de l'image via un proxy (contourne les restrictions CORS/hotlinking)
function getProxiedImageUrl(url) {
    if (!url) return null;
    // Utiliser images.weserv.nl comme proxy d'images (gratuit et fiable)
    // Ajouter des paramètres pour optimiser le chargement
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=1`;
}

// Éléments DOM
const albumForm = document.getElementById('album-form');
const albumsGrid = document.getElementById('albums-grid');
const emptyState = document.getElementById('empty-state');
const albumCount = document.getElementById('album-count');
const searchInput = document.getElementById('search-input');
const filterGenre = document.getElementById('filter-genre');
const filterRating = document.getElementById('filter-rating');
const sortBy = document.getElementById('sort-by');
const starRating = document.getElementById('star-rating');
const ratingInput = document.getElementById('rating');
const modal = document.getElementById('album-modal');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');
const aotyUrlInput = document.getElementById('aoty-url');
const importBtn = document.getElementById('import-btn');
const importStatus = document.getElementById('import-status');
const submitBtn = document.getElementById('submit-btn');
const coverPreview = document.getElementById('imported-cover-preview');
const previewCoverImg = document.getElementById('preview-cover-img');
const removeCoverBtn = document.getElementById('remove-cover');
const clearFormBtn = document.getElementById('clear-form-btn');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Charger les albums depuis le JSON d'abord
    await loadAlbumsFromJSON();
    
    initializeStarRating();
    populateGenreFilter();
    renderAlbums();
    setupEventListeners();
    setDefaultDate();
});

// Configuration de la date par défaut
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('listen-date').value = today;
}

// Initialisation du système de notation par étoiles
function initializeStarRating() {
    const stars = starRating.querySelectorAll('i');
    
    stars.forEach((star, index) => {
        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });
        
        star.addEventListener('mouseleave', () => {
            highlightStars(currentRating);
        });
        
        star.addEventListener('click', () => {
            currentRating = index + 1;
            ratingInput.value = currentRating;
            highlightStars(currentRating);
            checkFormValidity();
        });
    });
}

function highlightStars(count) {
    const stars = starRating.querySelectorAll('i');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Vérifier si le formulaire peut être soumis
function checkFormValidity() {
    const title = document.getElementById('album-title').value.trim();
    const artist = document.getElementById('artist-name').value.trim();
    const genre = document.getElementById('genre').value;
    const listenDate = document.getElementById('listen-date').value;
    const hasRating = currentRating > 0;
    
    const isValid = title && artist && genre && listenDate && hasRating;
    submitBtn.disabled = !isValid;
}

// Remplir le filtre de genres
function populateGenreFilter() {
    const genres = [...new Set(albums.map(album => album.genre))].sort();
    filterGenre.innerHTML = '<option value="">Tous les genres</option>';
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        filterGenre.appendChild(option);
    });
}

// Configuration des événements
function setupEventListeners() {
    // Soumission du formulaire
    albumForm.addEventListener('submit', handleFormSubmit);
    
    // Vérification de validité
    document.getElementById('album-title').addEventListener('input', checkFormValidity);
    document.getElementById('artist-name').addEventListener('input', checkFormValidity);
    document.getElementById('genre').addEventListener('input', checkFormValidity);
    document.getElementById('listen-date').addEventListener('change', checkFormValidity);
    
    // Import AOTY
    importBtn.addEventListener('click', handleAotyImport);
    aotyUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAotyImport();
        }
    });
    
    // Supprimer la pochette
    removeCoverBtn.addEventListener('click', removeCover);
    
    // Vider le formulaire
    clearFormBtn.addEventListener('click', resetForm);
    
    // Filtres et recherche
    searchInput.addEventListener('input', debounce(renderAlbums, 300));
    filterGenre.addEventListener('change', renderAlbums);
    filterRating.addEventListener('change', renderAlbums);
    sortBy.addEventListener('change', renderAlbums);
    
    // Modal
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Échapper pour fermer le modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Import depuis Album of the Year
async function handleAotyImport() {
    const url = aotyUrlInput.value.trim();
    
    if (!url) {
        showImportStatus('Veuillez entrer un lien', 'error');
        return;
    }
    
    if (!url.includes('albumoftheyear.org/album/')) {
        showImportStatus('Le lien doit provenir de albumoftheyear.org', 'error');
        return;
    }
    
    // État de chargement
    importBtn.disabled = true;
    importBtn.classList.add('loading');
    importBtn.innerHTML = '<i class="fas fa-spinner"></i> Chargement...';
    showImportStatus('<i class="fas fa-spinner fa-spin"></i> Récupération des données...', 'loading');
    
    // Réinitialiser la pochette précédente
    coverPreview.style.display = 'none';
    previewCoverImg.src = '';
    document.getElementById('cover-url').value = '';
    
    try {
        // Utiliser un proxy CORS
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error('Impossible de récupérer la page');
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extraire les informations
        const albumData = extractAlbumData(doc, url);
        
        if (!albumData.title) {
            throw new Error('Impossible d\'extraire les informations de l\'album');
        }
        
        // Remplir le formulaire
        fillFormWithImportedData(albumData);
        
        showImportStatus(`<i class="fas fa-check-circle"></i> Album importé : ${albumData.title} - ${albumData.artist}`, 'success');
        
    } catch (error) {
        console.error('Erreur d\'import:', error);
        showImportStatus(`<i class="fas fa-exclamation-circle"></i> Erreur: ${error.message}`, 'error');
    } finally {
        importBtn.disabled = false;
        importBtn.classList.remove('loading');
        importBtn.innerHTML = '<i class="fas fa-download"></i> Récupérer les infos';
    }
}

// Extraire les données de la page AOTY
function extractAlbumData(doc, url) {
    const data = {
        title: '',
        artist: '',
        genre: '',
        releaseYear: '',
        format: '',
        coverUrl: '',
        aotyLink: url
    };
    
    // Titre de l'album
    const titleEl = doc.querySelector('.albumTitle h1') || 
                    doc.querySelector('.albumTitle') || 
                    doc.querySelector('h1.albumTitle');
    if (titleEl) {
        data.title = titleEl.textContent.trim();
    }
    
    // Artiste
    const artistEl = doc.querySelector('.albumTitle .artist a') || 
                     doc.querySelector('.artist a') ||
                     doc.querySelector('[itemprop="byArtist"] a') ||
                     doc.querySelector('.albumTitle span a') ||
                     doc.querySelector('.artist');
    if (artistEl) {
        data.artist = artistEl.textContent.trim();
    }
    
    // Si l'artiste n'est pas trouvé, essayer de l'extraire depuis l'URL
    if (!data.artist && url) {
        // Format URL: /album/516-franz-ferdinand-franz-ferdinand.php
        const urlMatch = url.match(/\/album\/\d+-([^\/]+?)(?:-[^\/]+)?\.php/i);
        if (urlMatch) {
            // Convertir les tirets en espaces et mettre en majuscule chaque mot
            data.artist = urlMatch[1].split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
    }
    
    // Date de sortie - se trouve dans la première balise .detailRow au format "Month Day, Year"
    const detailRow = doc.querySelector('.detailRow');
    if (detailRow) {
        const dateText = detailRow.textContent.trim();
        // Format: "January 25, 2026" ou similaire
        const dateMatch = dateText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+((?:19|20)\d{2})/i);
        if (dateMatch) {
            data.releaseYear = dateMatch[1];
        } else {
            // Fallback: chercher juste l'année
            const yearMatch = dateText.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                data.releaseYear = yearMatch[0];
            }
        }
    }
    
    // Format (LP, EP, etc.) - se trouve dans la deuxième balise .detailRow
    const detailRows = doc.querySelectorAll('.detailRow');
    if (detailRows.length >= 2) {
        const formatRow = detailRows[1];
        // Le format est le texte avant le span
        const formatText = formatRow.textContent.trim();
        const formatMatch = formatText.match(/^(LP|EP|Single|Mixtape|Compilation|Live)/i);
        if (formatMatch) {
            data.format = formatMatch[1].toUpperCase();
        }
    }
    
    // Genre - se trouve dans la quatrième balise .detailRow avec <meta itemprop="genre">
    const genreMetaEl = doc.querySelector('meta[itemprop="genre"]');
    if (genreMetaEl) {
        data.genre = genreMetaEl.getAttribute('content') || '';
    }
    
    // Pochette - se trouve dans <div class="albumTopBox cover">
    const coverContainer = doc.querySelector('.albumTopBox.cover');
    const coverEl = coverContainer ? coverContainer.querySelector('img') : null;
    if (coverEl) {
        let coverSrc = coverEl.getAttribute('src') || coverEl.getAttribute('data-src');
        if (coverSrc) {
            // S'assurer que l'URL est absolue
            if (coverSrc.startsWith('//')) {
                coverSrc = 'https:' + coverSrc;
            } else if (coverSrc.startsWith('/')) {
                coverSrc = 'https://www.albumoftheyear.org' + coverSrc;
            }
            // Essayer d'obtenir une version plus grande
            coverSrc = coverSrc.replace(/\/\d+x\d+\//, '/');
            data.coverUrl = coverSrc;
        }
    }
    
    return data;
}

// Mapper les genres AOTY vers nos genres
function mapGenre(aotyGenre) {
    const genreMap = {
        'rock': 'Rock',
        'alternative': 'Rock',
        'indie rock': 'Indie',
        'indie': 'Indie',
        'indie pop': 'Indie',
        'pop': 'Pop',
        'synth pop': 'Pop',
        'art pop': 'Pop',
        'hip hop': 'Hip-Hop',
        'hip-hop': 'Hip-Hop',
        'rap': 'Hip-Hop',
        'jazz': 'Jazz',
        'classical': 'Classique',
        'electronic': 'Électronique',
        'electro': 'Électronique',
        'edm': 'Électronique',
        'house': 'Électronique',
        'techno': 'Électronique',
        'r&b': 'R&B',
        'rnb': 'R&B',
        'soul': 'R&B',
        'metal': 'Metal',
        'heavy metal': 'Metal',
        'folk': 'Folk',
        'country': 'Folk',
        'acoustic': 'Folk'
    };
    
    const lowerGenre = aotyGenre.toLowerCase();
    
    for (const [key, value] of Object.entries(genreMap)) {
        if (lowerGenre.includes(key)) {
            return value;
        }
    }
    
    return 'Autre';
}

// Remplir le formulaire avec les données importées
function fillFormWithImportedData(data) {
    // Réinitialiser l'édition pour ne pas écraser un album existant
    editingAlbumId = null;
    
    // Réinitialiser la note
    currentRating = 0;
    ratingInput.value = 0;
    highlightStars(0);
    
    // Remettre le texte du bouton pour un nouvel album
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer l\'album';
    
    // Réinitialiser la date d'écoute à aujourd'hui
    setDefaultDate();
    
    // Vider la critique
    document.getElementById('review').value = '';
    
    document.getElementById('album-title').value = data.title;
    document.getElementById('artist-name').value = data.artist;
    document.getElementById('genre').value = data.genre || '';
    document.getElementById('release-year').value = data.releaseYear || '';
    document.getElementById('cover-url').value = data.coverUrl || '';
    document.getElementById('aoty-link').value = data.aotyLink || '';
    document.getElementById('album-format').value = data.format || '';
    
    // Afficher la prévisualisation de la pochette (avec proxy)
    if (data.coverUrl) {
        previewCoverImg.src = getProxiedImageUrl(data.coverUrl);
        coverPreview.style.display = 'block';
    }
    
    importedData = data;
    checkFormValidity();
    
    // Scroll vers le formulaire de notation
    document.querySelector('.rating-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Afficher le statut d'import
function showImportStatus(message, type) {
    importStatus.innerHTML = message;
    importStatus.className = 'import-status show ' + type;
}

// Supprimer la pochette
function removeCover() {
    document.getElementById('cover-url').value = '';
    previewCoverImg.src = '';
    coverPreview.style.display = 'none';
}

// Gestion de la soumission du formulaire
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const albumData = {
        id: editingAlbumId || Date.now().toString(),
        title: document.getElementById('album-title').value.trim(),
        artist: document.getElementById('artist-name').value.trim(),
        genre: document.getElementById('genre').value,
        releaseYear: document.getElementById('release-year').value || null,
        format: document.getElementById('album-format').value || null,
        listenDate: document.getElementById('listen-date').value,
        rating: currentRating,
        review: document.getElementById('review').value.trim(),
        coverUrl: document.getElementById('cover-url').value.trim() || null,
        aotyLink: document.getElementById('aoty-link').value.trim() || null,
        createdAt: editingAlbumId ? 
            albums.find(a => a.id === editingAlbumId)?.createdAt : 
            new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingAlbumId) {
        // Mise à jour
        const index = albums.findIndex(a => a.id === editingAlbumId);
        if (index !== -1) {
            albums[index] = albumData;
        }
        showToast('Album modifié avec succès !', 'success');
        editingAlbumId = null;
    } else {
        // Vérifier si l'album existe déjà (même titre et même artiste)
        const albumExists = albums.some(a => 
            a.title.toLowerCase() === albumData.title.toLowerCase() && 
            a.artist.toLowerCase() === albumData.artist.toLowerCase()
        );
        
        if (albumExists) {
            showToast('Cet album est déjà dans votre collection !', 'error');
            return;
        }
        
        // Ajout
        albums.push(albumData);
        showToast('Album ajouté avec succès !', 'success');
    }
    
    await saveAlbums();
    resetForm();
    populateGenreFilter();
    renderAlbums();
}

// Réinitialiser le formulaire
function resetForm() {
    albumForm.reset();
    currentRating = 0;
    highlightStars(0);
    ratingInput.value = 0;
    editingAlbumId = null;
    importedData = null;
    setDefaultDate();
    
    // Réinitialiser l'import
    aotyUrlInput.value = '';
    importStatus.className = 'import-status';
    coverPreview.style.display = 'none';
    previewCoverImg.src = '';
    document.getElementById('cover-url').value = '';
    document.getElementById('aoty-link').value = '';
    document.getElementById('album-format').value = '';
    
    // Désactiver le bouton
    submitBtn.disabled = true;
    
    // Remettre le texte du bouton
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer l\'album';
}

// Sauvegarder les albums (localStorage + GitHub)
async function saveAlbums() {
    // Toujours sauvegarder en local comme backup
    localStorage.setItem('musiclog-albums', JSON.stringify(albums));
    
    // Sauvegarder sur GitHub
    const saved = await saveToGitHub();
    if (saved) {
        showToast('Album synchronisé avec GitHub', 'success');
    }
}

// Filtrer et trier les albums
function getFilteredAlbums() {
    let filtered = [...albums];
    
    // Recherche
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(album => 
            album.title.toLowerCase().includes(searchTerm) ||
            album.artist.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtre par genre
    const genreFilter = filterGenre.value;
    if (genreFilter) {
        filtered = filtered.filter(album => album.genre === genreFilter);
    }
    
    // Filtre par note
    const ratingFilter = filterRating.value;
    if (ratingFilter) {
        if (ratingFilter === 'less5') {
            filtered = filtered.filter(album => album.rating < 5);
        } else {
            filtered = filtered.filter(album => album.rating >= parseInt(ratingFilter));
        }
    }
    
    // Tri
    const sortValue = sortBy.value;
    switch (sortValue) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.listenDate) - new Date(a.listenDate));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.listenDate) - new Date(b.listenDate));
            break;
        case 'rating-desc':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
        case 'rating-asc':
            filtered.sort((a, b) => a.rating - b.rating);
            break;
        case 'title-asc':
            filtered.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    return filtered;
}

// Afficher les albums
function renderAlbums() {
    const filtered = getFilteredAlbums();
    
    if (filtered.length === 0) {
        albumsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        albumCount.textContent = '0 album';
    } else {
        emptyState.style.display = 'none';
        albumCount.textContent = `${filtered.length} album${filtered.length > 1 ? 's' : ''}`;
        
        albumsGrid.innerHTML = filtered.map(album => createAlbumCard(album)).join('');
        
        // Ajouter les événements de clic
        albumsGrid.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', () => {
                const albumId = card.dataset.id;
                openAlbumDetail(albumId);
            });
        });
    }
}

// Créer une carte d'album
function createAlbumCard(album) {
    const starsHtml = Array(10).fill(0).map((_, i) => 
        `<i class="fas fa-star ${i < album.rating ? 'filled' : ''}"></i>`
    ).join('');
    
    const proxiedCoverUrl = getProxiedImageUrl(album.coverUrl);
    const coverHtml = proxiedCoverUrl 
        ? `<img src="${proxiedCoverUrl}" alt="${album.title}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-compact-disc placeholder-icon\\'></i>'">`
        : '<i class="fas fa-compact-disc placeholder-icon"></i>';
    
    return `
        <div class="album-card" data-id="${album.id}">
            <div class="album-cover">
                ${coverHtml}
            </div>
            <div class="album-info">
                <h3 class="album-title" title="${album.title}">${album.title}</h3>
                <p class="album-artist">${album.artist}</p>
                <div class="album-meta">
                    <span class="album-genre">${album.genre}</span>
                    ${album.format ? `<span class="album-format">${album.format}</span>` : ''}
                    ${album.releaseYear ? `<span class="album-year">${album.releaseYear}</span>` : ''}
                </div>
                <div class="album-rating">
                    ${starsHtml}
                </div>
            </div>
        </div>
    `;
}

// Ouvrir le détail d'un album
function openAlbumDetail(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    const starsHtml = Array(10).fill(0).map((_, i) => 
        `<i class="fas fa-star ${i < album.rating ? 'filled' : ''}"></i>`
    ).join('');
    
    const proxiedCoverUrl = getProxiedImageUrl(album.coverUrl);
    const coverHtml = proxiedCoverUrl 
        ? `<img src="${proxiedCoverUrl}" alt="${album.title}" class="modal-cover" onerror="this.src=''; this.style.display='none'">`
        : `<div class="modal-cover" style="display:flex;align-items:center;justify-content:center;"><i class="fas fa-compact-disc" style="font-size:3rem;color:var(--purple-primary);opacity:0.5"></i></div>`;
    
    const listenDate = new Date(album.listenDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const aotyLinkHtml = album.aotyLink 
        ? `<a href="${album.aotyLink}" target="_blank" class="aoty-link" title="Voir sur Album of the Year"><i class="fas fa-external-link-alt"></i> AOTY</a>`
        : '';
    
    modalBody.innerHTML = `
        <div class="modal-album-detail">
            <div class="modal-album-header">
                ${coverHtml}
                <div class="modal-album-info">
                    <h2>${album.title}</h2>
                    <p class="artist">${album.artist}</p>
                    <div class="details">
                        <span><i class="fas fa-tag"></i> ${album.genre}</span>
                        ${album.format ? `<span><i class="fas fa-compact-disc"></i> ${album.format}</span>` : ''}
                        ${album.releaseYear ? `<span><i class="fas fa-calendar"></i> ${album.releaseYear}</span>` : ''}
                        <span><i class="fas fa-headphones"></i> ${listenDate}</span>
                    </div>
                    <div class="modal-rating">
                        ${starsHtml}
                    </div>
                    ${aotyLinkHtml}
                </div>
            </div>
            ${album.review ? `
                <div class="modal-review">
                    <h4><i class="fas fa-comment"></i> Mon avis</h4>
                    <p>${album.review}</p>
                </div>
            ` : ''}
            <div class="modal-actions">
                <button class="btn-secondary" onclick="editAlbum('${album.id}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="btn-danger" onclick="deleteAlbum('${album.id}')">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Fermer le modal
function closeModal() {
    modal.classList.remove('active');
}

// Modifier un album
function editAlbum(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    closeModal();
    
    // Remplir le formulaire
    document.getElementById('album-title').value = album.title;
    document.getElementById('artist-name').value = album.artist;
    document.getElementById('genre').value = album.genre;
    document.getElementById('release-year').value = album.releaseYear || '';
    document.getElementById('listen-date').value = album.listenDate;
    document.getElementById('review').value = album.review || '';
    document.getElementById('cover-url').value = album.coverUrl || '';
    document.getElementById('aoty-link').value = album.aotyLink || '';
    
    // Afficher la pochette si elle existe (avec proxy)
    if (album.coverUrl) {
        previewCoverImg.src = getProxiedImageUrl(album.coverUrl);
        coverPreview.style.display = 'block';
    }
    
    currentRating = album.rating;
    ratingInput.value = currentRating;
    highlightStars(currentRating);
    
    editingAlbumId = albumId;
    
    // Activer le bouton et changer le texte
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour l\'album';
    
    // Scroll vers le formulaire
    document.querySelector('.add-album-section').scrollIntoView({ behavior: 'smooth' });
}

// Supprimer un album
async function deleteAlbum(albumId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet album ?')) {
        albums = albums.filter(a => a.id !== albumId);
        await saveAlbums();
        closeModal();
        populateGenreFilter();
        renderAlbums();
    }
}

// Afficher une notification toast
function showToast(message, type = 'success') {
    // Supprimer les toasts existants
    document.querySelectorAll('.toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Afficher
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Masquer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Fonction debounce pour la recherche
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
