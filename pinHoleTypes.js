// pinHoleTypes.js - Manages pin hole type CRUD operations
document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin Hole Types module initializing...");
    
    // Initialize Firebase collection for pin hole types
    const pinHoleTypesCollection = window.db.collection('pinHoleTypes');

    // Array to store pin hole types
    window.pinHoleTypes = [];
    window.currentPinHoleTypeId = null;

    // Load pin hole types from Firebase
    async function loadPinHoleTypes() {
        try {
            console.log("Loading pin hole types from Firebase...");
            const snapshot = await pinHoleTypesCollection.orderBy('name').get();
            window.pinHoleTypes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Loaded pin hole types:", window.pinHoleTypes);
            renderPinHoleTypesList();
            
            // Dispatch event to notify other components
            const event = new CustomEvent('pinHoleTypesLoaded', { 
                detail: { pinHoleTypes: window.pinHoleTypes } 
            });
            document.dispatchEvent(event);
            
            return window.pinHoleTypes;
        } catch (error) {
            window.showToast('Error loading pin hole types: ' + error.message);
            console.error('Error loading pin hole types:', error);
            return [];
        }
    }

    // Render pin hole types list
    function renderPinHoleTypesList() {
        const pinHoleTypesListContainer = document.getElementById('pinHoleTypesListContainer');
        const pinHoleTypesEmptyState = document.getElementById('pinHoleTypesEmptyState');
        
        if (!pinHoleTypesListContainer || !pinHoleTypesEmptyState) return;
        
        if (window.pinHoleTypes.length === 0) {
            pinHoleTypesListContainer.style.display = 'none';
            pinHoleTypesEmptyState.style.display = 'flex';
            return;
        }
        
        pinHoleTypesListContainer.style.display = 'grid';
        pinHoleTypesEmptyState.style.display = 'none';
        
        pinHoleTypesListContainer.innerHTML = '';
        
        window.pinHoleTypes.forEach(pinHoleType => {
            const pinHoleTypeCard = document.createElement('div');
            pinHoleTypeCard.className = 'egg-type-card';
            
            pinHoleTypeCard.innerHTML = `
                <div class="header">
                    <h3>${pinHoleType.name}</h3>
                    <div class="actions">
                        <button class="action-btn edit" data-id="${pinHoleType.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${pinHoleType.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="label">Daily Loss Rate Increase:</span>
                    <span class="value">${parseFloat(pinHoleType.dailyLossRateIncrease).toFixed(2)} g</span>
                </div>
                ${pinHoleType.description ? `<div class="notes">${pinHoleType.description}</div>` : ''}
            `;
            
            // Add event listeners to buttons
            const editBtn = pinHoleTypeCard.querySelector('.edit');
            const deleteBtn = pinHoleTypeCard.querySelector('.delete');
            
            editBtn.addEventListener('click', () => {
                const event = new CustomEvent('openEditPinHoleTypeModal', { 
                    detail: { pinHoleTypeId: pinHoleType.id } 
                });
                document.dispatchEvent(event);
            });
            
            deleteBtn.addEventListener('click', () => {
                deletePinHoleType(pinHoleType.id);
            });
            
            pinHoleTypesListContainer.appendChild(pinHoleTypeCard);
        });
    }

    // Delete pin hole type
    async function deletePinHoleType(pinHoleTypeId) {
        if (confirm('Are you sure you want to delete this pin hole type?')) {
            try {
                await pinHoleTypesCollection.doc(pinHoleTypeId).delete();
                window.showToast('Pin hole type deleted successfully!');
                loadPinHoleTypes();
            } catch (error) {
                window.showToast('Error deleting pin hole type: ' + error.message);
                console.error('Error deleting pin hole type:', error);
            }
        }
    }

    // Add a new pin hole type
    window.addPinHoleType = async function(pinHoleTypeData) {
        try {
            console.log("Adding new pin hole type:", pinHoleTypeData);
            await pinHoleTypesCollection.add(pinHoleTypeData);
            window.showToast('Pin hole type added successfully!');
            const event = new CustomEvent('hideAddPinHoleTypeModal');
            document.dispatchEvent(event);
            loadPinHoleTypes();
        } catch (error) {
            window.showToast('Error adding pin hole type: ' + error.message);
            console.error('Error adding pin hole type:', error);
        }
    };
    
    // Update an existing pin hole type
    window.updatePinHoleType = async function(pinHoleTypeId, pinHoleTypeData) {
        try {
            await pinHoleTypesCollection.doc(pinHoleTypeId).update(pinHoleTypeData);
            window.showToast('Pin hole type updated successfully!');
            const event = new CustomEvent('hideEditPinHoleTypeModal');
            document.dispatchEvent(event);
            loadPinHoleTypes();
        } catch (error) {
            window.showToast('Error updating pin hole type: ' + error.message);
            console.error('Error updating pin hole type:', error);
        }
    };

    // Listen for custom events
    document.addEventListener('loadPinHoleTypes', loadPinHoleTypes);
    
    // Make functions available globally
    window.pinHoleTypesModule = {
        loadPinHoleTypes,
        renderPinHoleTypesList,
        deletePinHoleType
    };
    
    // Initialize by loading pin hole types
    loadPinHoleTypes();
});
