// pinHoleTypesForm.js - Handles the forms for pin hole types
document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin Hole Types Forms module initializing...");
    
    // DOM Elements for modals
    const addPinHoleTypeModal = document.getElementById('addPinHoleTypeModal');
    const addPinHoleTypeForm = document.getElementById('addPinHoleTypeForm');
    const closeAddPinHoleTypeModal = document.getElementById('closeAddPinHoleTypeModal');
    const cancelAddPinHoleType = document.getElementById('cancelAddPinHoleType');
    const editPinHoleTypeModal = document.getElementById('editPinHoleTypeModal');
    const editPinHoleTypeForm = document.getElementById('editPinHoleTypeForm');
    const closeEditPinHoleTypeModal = document.getElementById('closeEditPinHoleTypeModal');
    const cancelEditPinHoleType = document.getElementById('cancelEditPinHoleType');
    
    // Show Add Pin Hole Type Modal
    function showAddPinHoleTypeModal() {
        console.log("Showing Add Pin Hole Type Modal");
        addPinHoleTypeModal.classList.add('show');
        addPinHoleTypeForm.reset();
    }

    // Hide Add Pin Hole Type Modal
    function hideAddPinHoleTypeModal() {
        addPinHoleTypeModal.classList.remove('show');
    }

    // Show Edit Pin Hole Type Modal
    function showEditPinHoleTypeModal() {
        editPinHoleTypeModal.classList.add('show');
    }

    // Hide Edit Pin Hole Type Modal
    function hideEditPinHoleTypeModal() {
        editPinHoleTypeModal.classList.remove('show');
    }

    // Open Edit Pin Hole Type Modal with data
    function openEditPinHoleTypeModal(pinHoleTypeId) {
        const pinHoleType = window.pinHoleTypes.find(type => type.id === pinHoleTypeId);
        
        if (!pinHoleType) {
            window.showToast('Pin hole type not found');
            return;
        }
        
        window.currentPinHoleTypeId = pinHoleTypeId;
        
        document.getElementById('editPinHoleTypeId').value = pinHoleType.id;
        document.getElementById('editPinHoleTypeName').value = pinHoleType.name;
        document.getElementById('editDailyLossRateIncrease').value = pinHoleType.dailyLossRateIncrease;
        document.getElementById('editPinHoleTypeDescription').value = pinHoleType.description || '';
        
        showEditPinHoleTypeModal();
    }
    
    // Event Listeners for modals
    if (closeAddPinHoleTypeModal) closeAddPinHoleTypeModal.addEventListener('click', hideAddPinHoleTypeModal);
    if (cancelAddPinHoleType) cancelAddPinHoleType.addEventListener('click', hideAddPinHoleTypeModal);
    if (closeEditPinHoleTypeModal) closeEditPinHoleTypeModal.addEventListener('click', hideEditPinHoleTypeModal);
    if (cancelEditPinHoleType) cancelEditPinHoleType.addEventListener('click', hideEditPinHoleTypeModal);
    
    // Add Pin Hole Type Form Submission
    if (addPinHoleTypeForm) {
        addPinHoleTypeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const lossRateValue = parseFloat(document.getElementById('dailyLossRateIncrease').value);
            
            const newPinHoleType = {
                name: document.getElementById('pinHoleTypeName').value,
                dailyLossRateIncrease: lossRateValue.toFixed(2),
                description: document.getElementById('pinHoleTypeDescription').value || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Call the global addPinHoleType function
            if (window.addPinHoleType) {
                await window.addPinHoleType(newPinHoleType);
            } else {
                console.error("addPinHoleType function not available");
            }
        });
    }

    // Edit Pin Hole Type Form Submission
    if (editPinHoleTypeForm) {
        editPinHoleTypeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pinHoleTypeId = document.getElementById('editPinHoleTypeId').value;
            const lossRateValue = parseFloat(document.getElementById('editDailyLossRateIncrease').value);
            
            const updatedPinHoleType = {
                name: document.getElementById('editPinHoleTypeName').value,
                dailyLossRateIncrease: lossRateValue.toFixed(2),
                description: document.getElementById('editPinHoleTypeDescription').value || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Call the global updatePinHoleType function
            if (window.updatePinHoleType) {
                await window.updatePinHoleType(pinHoleTypeId, updatedPinHoleType);
            } else {
                console.error("updatePinHoleType function not available");
            }
        });
    }
    
    // Listen for custom events
    document.addEventListener('showAddPinHoleTypeModal', showAddPinHoleTypeModal);
    document.addEventListener('hideAddPinHoleTypeModal', hideAddPinHoleTypeModal);
    document.addEventListener('openEditPinHoleTypeModal', function(e) {
        openEditPinHoleTypeModal(e.detail.pinHoleTypeId);
    });
    document.addEventListener('hideEditPinHoleTypeModal', hideEditPinHoleTypeModal);
    
    console.log("Pin Hole Types Forms module initialized");
});
