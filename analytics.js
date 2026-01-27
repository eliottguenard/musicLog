// Récupérer les albums depuis localStorage
let albums = JSON.parse(localStorage.getItem('musiclog-albums')) || [];

// Configuration des couleurs pour les graphiques
const chartColors = {
    purple: '#8b5cf6',
    purpleLight: '#a78bfa',
    purpleDark: '#6d28d9',
    violet: '#7c3aed',
    indigo: '#6366f1',
    fuchsia: '#d946ef',
    pink: '#ec4899',
    rose: '#f43f5e',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    emerald: '#10b981',
    lime: '#84cc16',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444',
    gray: '#71717a'
};

const colorPalette = [
    chartColors.purple,
    chartColors.fuchsia,
    chartColors.indigo,
    chartColors.pink,
    chartColors.violet,
    chartColors.cyan,
    chartColors.teal,
    chartColors.emerald,
    chartColors.orange,
    chartColors.rose
];

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (albums.length === 0) {
        showEmptyState();
    } else {
        hideEmptyState();
        updateStatistics();
        createCharts();
        populateTables();
    }
});

// Afficher l'état vide
function showEmptyState() {
    document.getElementById('empty-analytics').style.display = 'block';
    document.querySelector('.stats-overview').style.display = 'none';
    document.querySelector('.charts-section').style.display = 'none';
    document.querySelector('.tables-section').style.display = 'none';
}

// Masquer l'état vide
function hideEmptyState() {
    document.getElementById('empty-analytics').style.display = 'none';
    document.querySelector('.stats-overview').style.display = 'grid';
    document.querySelector('.charts-section').style.display = 'block';
    document.querySelector('.tables-section').style.display = 'grid';
}

// Mettre à jour les statistiques générales
function updateStatistics() {
    // Total albums
    document.getElementById('total-albums').textContent = albums.length;
    
    // Artistes uniques
    const uniqueArtists = [...new Set(albums.map(a => a.artist))];
    document.getElementById('total-artists').textContent = uniqueArtists.length;
    
    // Note moyenne
    const avgRating = albums.reduce((sum, a) => sum + a.rating, 0) / albums.length;
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    
    // Genre préféré
    const genreCounts = {};
    albums.forEach(a => {
        genreCounts[a.genre] = (genreCounts[a.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('top-genre').textContent = topGenre ? topGenre[0] : '-';
}

// Créer tous les graphiques
function createCharts() {
    createGenreChart();
    createRatingChart();
    createTimelineChart();
    createDecadeChart();
}

// Graphique de répartition par genre
function createGenreChart() {
    const ctx = document.getElementById('genre-chart').getContext('2d');
    
    const genreCounts = {};
    albums.forEach(a => {
        genreCounts[a.genre] = (genreCounts[a.genre] || 0) + 1;
    });
    
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedGenres.map(g => g[0]),
            datasets: [{
                data: sortedGenres.map(g => g[1]),
                backgroundColor: colorPalette.slice(0, sortedGenres.length),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#a1a1aa',
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1a25',
                    titleColor: '#ffffff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            },
            cutout: '60%'
        }
    });
}

// Graphique de distribution des notes
function createRatingChart() {
    const ctx = document.getElementById('rating-chart').getContext('2d');
    
    const ratingCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    albums.forEach(a => {
        if (a.rating >= 1 && a.rating <= 10) {
            ratingCounts[a.rating - 1]++;
        }
    });
    
    const maxCount = Math.ceil(Math.max(...ratingCounts) / 5) * 5;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★', '6 ★', '7 ★', '8 ★', '9 ★', '10 ★'],
            datasets: [{
                label: 'Nombre d\'albums',
                data: ratingCounts,
                backgroundColor: createGradient(ctx, chartColors.purpleDark, chartColors.purple),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a25',
                    titleColor: '#ffffff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12
                },
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end',
                    align: function(context) {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= maxCount - 1 ? 'bottom' : 'top';
                    },
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    formatter: (value) => value > 0 ? value : ''
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a1a1aa'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: maxCount,
                    ticks: {
                        stepSize: 5,
                        color: '#a1a1aa'
                    },
                    grid: {
                        color: '#27272a'
                    }
                }
            }
        }
    });
}

// Graphique de timeline des écoutes
function createTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // Grouper par mois
    const monthCounts = {};
    albums.forEach(a => {
        const date = new Date(a.listenDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    
    // Trier et prendre les 12 derniers mois
    const sortedMonths = Object.entries(monthCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);
    
    const labels = sortedMonths.map(m => {
        const [year, month] = m[0].split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Albums écoutés',
                data: sortedMonths.map(m => m[1]),
                borderColor: chartColors.purple,
                backgroundColor: createGradientArea(ctx),
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.purple,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a25',
                    titleColor: '#ffffff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a1a1aa'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#a1a1aa'
                    },
                    grid: {
                        color: '#27272a'
                    }
                }
            }
        }
    });
}

// Graphique par décennie
function createDecadeChart() {
    const ctx = document.getElementById('decade-chart').getContext('2d');
    
    const decadeCounts = {};
    albums.forEach(a => {
        if (a.releaseYear) {
            const decade = Math.floor(a.releaseYear / 10) * 10;
            const key = `${decade}s`;
            decadeCounts[key] = (decadeCounts[key] || 0) + 1;
        }
    });
    
    const sortedDecades = Object.entries(decadeCounts)
        .sort((a, b) => a[0].localeCompare(b[0]));
    
    const maxCount = Math.ceil(Math.max(...sortedDecades.map(d => d[1])) / 10) * 10;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDecades.map(d => d[0]),
            datasets: [{
                label: 'Nombre d\'albums',
                data: sortedDecades.map(d => d[1]),
                backgroundColor: colorPalette.slice(0, sortedDecades.length),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a25',
                    titleColor: '#ffffff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12
                },
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end',
                    align: function(context) {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= maxCount - 5 ? 'left' : 'right';
                    },
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    formatter: (value) => value > 0 ? value : ''
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: maxCount,
                    ticks: {
                        stepSize: 10,
                        color: '#a1a1aa'
                    },
                    grid: {
                        color: '#27272a'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a1a1aa'
                    }
                }
            }
        }
    });
}

// Créer un dégradé pour les barres
function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color2);
    gradient.addColorStop(1, color1);
    return gradient;
}

// Créer un dégradé pour l'aire
function createGradientArea(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
    return gradient;
}

// Peupler les tableaux
function populateTables() {
    populateTopAlbumsTable();
    populateTopArtistsTable();
    populateGenreStatsTable();
    populateHistoryTable();
}

// Tableau des top albums
function populateTopAlbumsTable() {
    const tbody = document.querySelector('#top-albums-table tbody');
    const topAlbums = [...albums]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
    
    tbody.innerHTML = topAlbums.map((album, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${album.title}</td>
            <td>${album.artist}</td>
            <td>${album.genre}</td>
            <td>
                <div class="rating-stars">
                    ${createStarsHtml(album.rating)}
                </div>
            </td>
        </tr>
    `).join('');
}

// Tableau des artistes les plus écoutés
function populateTopArtistsTable() {
    const tbody = document.querySelector('#top-artists-table tbody');
    
    const artistStats = {};
    albums.forEach(a => {
        if (!artistStats[a.artist]) {
            artistStats[a.artist] = { count: 0, totalRating: 0 };
        }
        artistStats[a.artist].count++;
        artistStats[a.artist].totalRating += a.rating;
    });
    
    const topArtists = Object.entries(artistStats)
        .map(([artist, stats]) => ({
            artist,
            count: stats.count,
            avgRating: stats.totalRating / stats.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    tbody.innerHTML = topArtists.map((artist, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${artist.artist}</td>
            <td>${artist.count}</td>
            <td>
                <div class="rating-stars">
                    ${createStarsHtml(Math.round(artist.avgRating))}
                </div>
                <span style="color: #a1a1aa; margin-left: 0.5rem; font-size: 0.75rem;">
                    (${artist.avgRating.toFixed(1)})
                </span>
            </td>
        </tr>
    `).join('');
}

// Tableau des statistiques par genre
function populateGenreStatsTable() {
    const tbody = document.querySelector('#genre-stats-table tbody');
    
    const genreStats = {};
    albums.forEach(a => {
        if (!genreStats[a.genre]) {
            genreStats[a.genre] = { count: 0, totalRating: 0 };
        }
        genreStats[a.genre].count++;
        genreStats[a.genre].totalRating += a.rating;
    });
    
    const total = albums.length;
    const sortedGenres = Object.entries(genreStats)
        .map(([genre, stats]) => ({
            genre,
            count: stats.count,
            avgRating: stats.totalRating / stats.count,
            percentage: (stats.count / total * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);
    
    tbody.innerHTML = sortedGenres.map(genre => `
        <tr>
            <td>${genre.genre}</td>
            <td>${genre.count}</td>
            <td>${genre.avgRating.toFixed(1)}/10</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 100px; height: 6px; background: #27272a; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${genre.percentage}%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa);"></div>
                    </div>
                    <span>${genre.percentage}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

// Tableau de l'historique
function populateHistoryTable() {
    const tbody = document.querySelector('#history-table tbody');
    
    const sortedAlbums = [...albums]
        .sort((a, b) => new Date(b.listenDate) - new Date(a.listenDate));
    
    tbody.innerHTML = sortedAlbums.map(album => {
        const date = new Date(album.listenDate).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        return `
            <tr>
                <td>${date}</td>
                <td>${album.title}</td>
                <td>${album.artist}</td>
                <td>${album.genre}</td>
                <td>${album.releaseYear || '-'}</td>
                <td>
                    <div class="rating-stars">
                        ${createStarsHtml(album.rating)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Créer le HTML des étoiles
function createStarsHtml(rating) {
    return Array(10).fill(0).map((_, i) => 
        `<i class="fas fa-star ${i < rating ? 'filled' : ''}"></i>`
    ).join('');
}
