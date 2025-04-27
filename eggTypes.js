// eggTypes.js - Manages egg type CRUD operations
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Types module initializing...");
    
    // Initialize Firebase collection for egg types
    const eggTypesCollection = window.db.collection('eggTypes');

    // DOM Elements for Egg Types Management
    const eggTypesListContainer = document.getElementById('eggTypesListContainer');
    const eggTypesEmptyState = document.getElementById('eggTypesEmptyState');
    const addEggTypeBtn = document.getElementById('addEggTypeBtn');
    const addFirstEggTypeBtn = document.getElementById('addFirstEggTypeBtn');

    // Array to store egg types
    window.eggTypes = [];
    window.currentEggTypeId = null;

    // Load egg types from Firebase
    async function loadEggTypes() {
        try {
            console.log("Loading egg types from Firebase...");
            const snapshot = await eggTypesCollection.orderBy('name').get();
            window.eggTypes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Loaded egg types:", window.eggTypes);
            renderEggTypesList();
        } catch (error) {
            window.showToast('Error loading egg types: ' + error.message);
            console.error('Error loading egg types:', error);
        }
    }

    // Render egg types list
    function renderEggTypesList() {
        console.log("Rendering egg types list, count:", window.eggTypes.length);
        if (window.eggTypes.length === 0) {
            eggTypesListContainer.style.display = 'none';
            eggTypesEmptyState.style.display = 'flex';
            return;
        }
        
        eggTypesListContainer.style.display = 'grid';
        eggTypesEmptyState.style.display = 'none';
        
        eggTypesListContainer.innerHTML = '';
        
        window.eggTypes.forEach(eggType => {
            const eggTypeCard = document.createElement('div');
            eggTypeCard.className = 'egg-type-card';
            
            eggTypeCard.innerHTML = `
                <div class="header">
                    <h3>${eggType.name}</h3>
                    <div class="actions">
                        <button class="action-btn edit" data-id="${eggType.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${eggType.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="label">Coefficient:</span>
                    <span class="value">${parseFloat(eggType.coefficient).toFixed(9)}</span>
                </div>
                ${eggType.notes ? `<div class="notes">${eggType.notes}</div>` : ''}
            `;
            
            // Add event listeners to buttons
            const editBtn = eggTypeCard.querySelector('.edit');
            const deleteBtn = eggTypeCard.querySelector('.delete');
            
            editBtn.addEventListener('click', () => {
                const event = new CustomEvent('openEditEggTypeModal', { 
                    detail: { eggTypeId: eggType.id } 
                });
                document.dispatchEvent(event);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteEggType(eggType.id);
            });
            
            eggTypesListContainer.appendChild(eggTypeCard);
        });
    }

    // Delete egg type
    async function deleteEggType(eggTypeId) {
        if (confirm('Are you sure you want to delete this egg type?')) {
            try {
                await eggTypesCollection.doc(eggTypeId).delete();
                window.showToast('Egg type deleted successfully!');
                loadEggTypes();
            } catch (error) {
                window.showToast('Error deleting egg type: ' + error.message);
                console.error('Error deleting egg type:', error);
            }
        }
    }

    // Add event listeners for egg type management
    addEggTypeBtn.addEventListener('click', function() {
        const event = new CustomEvent('showAddEggTypeModal');
        document.dispatchEvent(event);
    });
    
    addFirstEggTypeBtn.addEventListener('click', function() {
        const event = new CustomEvent('showAddEggTypeModal');
        document.dispatchEvent(event);
    });

    // Listen for custom events
    document.addEventListener('loadEggTypes', loadEggTypes);
    
    // Make functions available to window for other modules
    window.addEggType = async function(eggTypeData) {
        try {
            console.log("Adding new egg type:", eggTypeData);
            await eggTypesCollection.add(eggTypeData);
            window.showToast('Egg type added successfully!');
            const event = new CustomEvent('hideAddEggTypeModal');
            document.dispatchEvent(event);
            loadEggTypes();
        } catch (error) {
            window.showToast('Error adding egg type: ' + error.message);
            console.error('Error adding egg type:', error);
        }
    };
    
window.updateEggType = async function(eggTypeId, eggTypeData) {
    try {
        await eggTypesCollection.doc(eggTypeId).update(eggTypeData);
        window.showToast('Egg type updated successfully!');
        const event = new CustomEvent('hideEditEggTypeModal');
        document.dispatchEvent(event);
        loadEggTypes();
    } catch (error) {
        window.showToast('Error updating egg type: ' + error.message);
        console.error('Error updating egg type:', error);
    }
};

// Initialize by loading egg types
loadEggTypes();

    });
