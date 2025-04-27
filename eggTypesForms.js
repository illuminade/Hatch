// eggTypesForms.js - Handles the forms for adding/editing egg types
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Types Forms module initializing...");
    
    // DOM Elements for modals
    const addEggTypeModal = document.getElementById('addEggTypeModal');
    const addEggTypeForm = document.getElementById('addEggTypeForm');
    const closeAddEggTypeModal = document.getElementById('closeAddEggTypeModal');
    const cancelAddEggType = document.getElementById('cancelAddEggType');
    const editEggTypeModal = document.getElementById('editEggTypeModal');
    const editEggTypeForm = document.getElementById('editEggTypeForm');
    const closeEditEggTypeModal = document.getElementById('closeEditEggTypeModal');
    const cancelEditEggType = document.getElementById('cancelEditEggType');
    
    // Show Add Egg Type Modal
    function showAddEggTypeModal() {
        console.log("Showing Add Egg Type Modal");
        addEggTypeModal.classList.add('show');
        addEggTypeForm.reset();
    }

    // Hide Add Egg Type Modal
    function hideAddEggTypeModal() {
        addEggTypeModal.classList.remove('show');
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
        const eggType = window.eggTypes.find(type => type.id === eggTypeId);
        
        if (!eggType) {
            window.showToast('Egg type not found');
            return;
        }
        
        window.currentEggTypeId = eggTypeId;
        
        document.getElementById('editEggTypeId').value = eggType.id;
        document.getElementById('editEggTypeName').value = eggType.name;
        document.getElementById('editCoefficientNumber').value = eggType.coefficient;
        document.getElementById('editEggTypeNotes').value = eggType.notes || '';
        
        showEditEggTypeModal();
    }
    
    // Event Listeners for modals
    closeAddEggTypeModal.addEventListener('click', hideAddEggTypeModal);
    cancelAddEggType.addEventListener('click', hideAddEggTypeModal);
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
        
        // Call the global addEggType function (defined in eggTypes.js)
        if (window.addEggType) {
            await window.addEggType(newEggType);
        } else {
            console.error("addEggType function not available");
        }
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
        
        // Call the global updateEggType function (defined in eggTypes.js)
        if (window.updateEggType) {
            await window.updateEggType(eggTypeId, updatedEggType);
        } else {
            console.error("updateEggType function not available");
        }
    });
    
    // Listen for custom events
    document.addEventListener('showAddEggTypeModal', showAddEggTypeModal);
    document.addEventListener('hideAddEggTypeModal', hideAddEggTypeModal);
    document.addEventListener('openEditEggTypeModal', function(e) {
        openEditEggTypeModal(e.detail.eggTypeId);
    });
    document.addEventListener('hideEditEggTypeModal', hideEditEggTypeModal);
    
    console.log("Egg Types Forms module initialized");
});
