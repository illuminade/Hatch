// management.js - JavaScript for egg types management page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Types Management page initializing...");
    
    // Initialize Firebase collection for egg types
    const eggTypesCollection = window.db.collection('eggTypes');

    // DOM Elements
    const eggTypesListContainer = document.getElementById('eggTypesListContainer');
    const eggTypesEmptyState = document.getElementById('eggTypesEmptyState');
    const addEggTypeForm = document.getElementById('addEggTypeForm');
    const editEggTypeModal = document.getElementById('editEggTypeModal');
    const editEggTypeForm = document.getElementById('editEggTypeForm');
    const closeEditEggTypeModal = document.getElementById('closeEditEggTypeModal');
    const cancelEditEggType = document.getElementById('cancelEditEggType');
    const backToHomeButton = document.getElementById('backToHomeButton');
    const toast = document.getElementById('toast');

    // Array to store egg types
    let eggTypes = [];
    let currentEggTypeId = null;

    // Show toast message
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Back button to return to home
    backToHomeButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Load egg types from Firebase
    async function loadEggTypes() {
        try {
            console.log("Loading egg types from Firebase...");
            const snapshot = await eggTypesCollection.orderBy('name').get();
            eggTypes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Loaded egg types:", eggTypes);
            renderEggTypesList();
        } catch (error) {
            showToast('Error loading egg types: ' + error.message);
            console.error('Error loading egg types:', error);
        }
    }

    // Render egg types list
    function renderEggTypesList() {
        console.log("Rendering egg types list, count:", eggTypes.length);
        if (eggTypes.length === 0) {
            eggTypesListContainer.style.display = 'none';
            eggTypesEmptyState.style.display = 'flex';
            return;
        }
        
        eggTypesListContainer.style.display = 'grid';
        eggTypesEmptyState.style.display = 'none';
        
        eggTypesListContainer.innerHTML = '';
        
        eggTypes.forEach(eggType => {
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
                openEditEggTypeModal(eggType.id);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteEggType(eggType.id);
            });
            
            eggTypesListContainer.appendChild(eggTypeCard);
        });
    }

    // Show Edit Egg Type Modal
    function showEditEggTypeModal() {
        editEggTypeModal.classList.add('show');
    }

    // Hide Edit Egg Type Modal
    function hideEditEggTypeModal() {
        editEggTypeModal.classList.remove('show');
    }

    // Open Edit Egg Type Modal with data
    function openEditEggTypeModal(eggTypeId) {
        const eggType = eggTypes.find(type => type.id === eggTypeId);
        
        if (!eggType) {
            showToast('Egg type not found');
            return;
        }
        
        currentEggTypeId = eggTypeId;
        
        document.getElementById('editEggTypeId').value = eggType.id;
        document.getElementById('editEggTypeName').value = eggType.name;
        document.getElementById('editCoefficientNumber').value = eggType.coefficient;
        document.getElementById('editEggTypeNotes').value = eggType.notes || '';
        
        showEditEggTypeModal();
    }

    // Add new egg type
    async function addEggType(eggTypeData) {
        try {
            console.log("Adding new egg type:", eggTypeData);
            await eggTypesCollection.add(eggTypeData);
            showToast('Egg type added successfully!');
            addEggTypeForm.reset();
            loadEggTypes();
        } catch (error) {
            showToast('Error adding egg type: ' + error.message);
            console.error('Error adding egg type:', error);
        }
    }

    // Update egg type
    async function updateEggType(eggTypeId, eggTypeData) {
        try {
            await eggTypesCollection.doc(eggTypeId).update(eggTypeData);
            showToast('Egg type updated successfully!');
            hideEditEggTypeModal();
            loadEggTypes();
        } catch (error) {
            showToast('Error updating egg type: ' + error.message);
            console.error('Error updating egg type:', error);
        }
    }

    // Delete egg type
    async function deleteEggType(eggTypeId) {
        if (confirm('Are you sure you want to delete this egg type?')) {
            try {
                await eggTypesCollection.doc(eggTypeId).delete();
                showToast('Egg type deleted successfully!');
                loadEggTypes();
            } catch (error) {
                showToast('Error deleting egg type: ' + error.message);
                console.error('Error deleting egg type:', error);
            }
        }
    }

    // Event Listeners
    closeEditEggTypeModal.addEventListener('click', hideEditEggTypeModal);
    cancelEditEggType.addEventListener('click', hideEditEggTypeModal);

    // Add Egg Type Form Submission
    addEggTypeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const coefficientValue = parseFloat(document.getElementById('coefficientNumber').value);
        
        const newEggType = {
            name: document.getElementById('eggTypeName').value,
            coefficient: coefficientValue.toFixed(9),
            notes: document.getElementById('eggTypeNotes').value || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await addEggType(newEggType);
    });

    // Edit Egg Type Form Submission
    editEggTypeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eggTypeId = document.getElementById('editEggTypeId').value;
        const coefficientValue = parseFloat(document.getElementById('editCoefficientNumber').value);
        
        const updatedEggType = {
            name: document.getElementById('editEggTypeName').value,
            coefficient: coefficientValue.toFixed(9),
            notes: document.getElementById('editEggTypeNotes').value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await updateEggType(eggTypeId, updatedEggType);
    });

    // Initialize the page
    loadEggTypes();
    
    console.log("Egg Types Management page initialized");
});
