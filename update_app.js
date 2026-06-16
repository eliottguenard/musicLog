const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// 1. Replace GitHub integration & loadAlbumsFromJSON with Supabase config & loadAlbumsFromSupabase
const replaceTop = `// Configuration Supabase
const supabaseUrl = 'https://jbbkquecyuaybrhtpjmd.supabase.co';
const supabaseKey = 'sb_publishable_K5XbQ_52aqo3EyGAmLhU1A_g9dp5i9a';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Charger les albums depuis Supabase
async function loadAlbumsFromSupabase() {
    try {
        const { data, error } = await supabase.from('albums').select('*');
        if (error) throw error;
        
        if (data && data.length > 0) {
            albums = data;
            console.log(\`\${albums.length} albums chargés depuis Supabase\`);
        }
    } catch (error) {
        console.error('Erreur lors du chargement depuis Supabase:', error);
        showToast('Erreur lors du chargement des albums', 'error');
    }
    albumsLoaded = true;
}`;

content = content.replace(/\/\/ Configuration GitHub pour sauvegarder albums\.json[\s\S]*?albumsLoaded = true;\n}/, replaceTop);

// 2. Replace handleFormSubmit to save to Supabase
// Find handleFormSubmit function up to saveAlbums()
const saveRegex = /if \(editingAlbumId\) \{[\s\S]*?showToast\('Album ajouté avec succès !', 'success'\);\n    \}/;
const replaceSave = `if (editingAlbumId) {
        // Mise à jour locale
        const index = albums.findIndex(a => a.id === editingAlbumId);
        if (index !== -1) {
            albums[index] = albumData;
        }
        
        // Mise à jour Supabase
        supabase.from('albums').update(albumData).eq('id', editingAlbumId).then(({error}) => {
            if (error) console.error('Erreur mise à jour Supabase:', error);
        });
        
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
        
        // Ajout local
        albums.push(albumData);
        
        // Ajout Supabase
        supabase.from('albums').insert([albumData]).then(({error}) => {
            if (error) console.error('Erreur insertion Supabase:', error);
        });
        
        showToast('Album ajouté avec succès !', 'success');
    }`;
content = content.replace(saveRegex, replaceSave);

// 3. Replace loadAlbumsFromJSON call in DOMContentLoaded
content = content.replace('await loadAlbumsFromJSON();', 'await loadAlbumsFromSupabase();');

// 4. Update saveAlbums() to do nothing or remove the GitHub backup (since it's in Supabase now)
const saveAlbumsRegex = /\/\/ Sauvegarder les albums \(localStorage \+ GitHub\)[\s\S]*?function getFilteredAlbums\(\)/;
const replaceSaveAlbums = `// Sauvegarder les albums (désormais géré directement dans handleFormSubmit)
async function saveAlbums() {
    // Les sauvegardes sont faites directement via Supabase
}

// Filtrer et trier les albums
function getFilteredAlbums()`;
content = content.replace(saveAlbumsRegex, replaceSaveAlbums);

// 5. Update deleteAlbum
const deleteRegex = /if \(confirm\('Êtes-vous sûr de vouloir supprimer cet album \?'\)\) \{[\s\S]*?showToast\('Album supprimé !', 'success'\);\n    \}/;
const replaceDelete = `if (confirm('Êtes-vous sûr de vouloir supprimer cet album ?')) {
        // Suppression locale
        albums = albums.filter(a => a.id !== albumId);
        
        // Suppression Supabase
        supabase.from('albums').delete().eq('id', albumId).then(({error}) => {
            if (error) console.error('Erreur suppression Supabase:', error);
        });
        
        // Sauvegarder et réafficher
        saveAlbums();
        renderAlbums();
        populateGenreFilter();
        
        showToast('Album supprimé !', 'success');
    }`;
content = content.replace(deleteRegex, replaceDelete);

fs.writeFileSync('app.js', content);
console.log("app.js updated successfully");
