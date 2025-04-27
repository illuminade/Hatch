// eggManagement.js - Updated version
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Management system initializing...");
    
    // Initialize Firebase collection for egg types
    const eggTypesCollection = window.db.collection('eggTypes');

    // DOM Elements for Egg Management
    const eggManagementPage = document.getElementById('eggManagementPage');
    const eggTypesListContainer = document.getElementById('eggTypesListContainer');
    const eggTypesEmptyState = document.getElementById('eggTypesEmptyState');
    const addEggTypeBtn = document.getElementById('addEggTypeBtn');
    const addFirstEggTypeBtn = document.getElementById('addFirstEggTypeBtn');
    const addEggTypeModal = document.getElementById('addEggTypeModal');
    const addEggTypeForm = document.getElementById('addEggTypeForm');
    const closeAddEggTypeModal = document.getElementById('closeAddEggTypeModal');
    const cancelAddEggType = document.getElementById('cancelAddEggType');
    const editEggTypeModal = document.getElementById('editEggTypeModal');
    const editEggTypeForm = document.getElementById('editEggTypeForm');
    const closeEditEggTypeModal = document.getElementById('closeEditEggTypeModal');
    const cancelEditEggType = document.getElementById('cancelEditEggType');

    // Array to store egg types
    let eggTypes = [];
    let currentEggTypeId = null;

    // Add navigation to header - FIXED VERSION
    function addNavigation() {
        // Get the existing settings link
        const settingsLink = document.getElementById('settingsLink');
        
        if (settingsLink) {
            console.log("Settings link found, adding event listener");
            // Add event listener to the existing link
            settingsLink.addEventListener('click', function(e) {
                console.log("Settings link clicked");
                e.preventDefault();
                
                // Hide all pages
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.remove('active');
                });
                
                // Show egg management page
                document.getElementById('eggManagementPage').classList.add('active');
                document.getElementById('backButton').style.display = 'flex';
                document.getElementById('addEggButton').style.display = 'none';
                
                // Update current page
                window.previousPage = window.currentPage;
                window.currentPage = 'eggManagement';
                
                // Load egg types when page is opened
                loadEggTypes();
            });
        } else {
            console.error("Settings link not found in the DOM");
        }
    }
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
            window.showToast('Error loading egg types: ' + error.message);
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
                    <span class="label">Incubation Period:</span>
                    <span class="value">${eggType.incubationPeriod} days</span>
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
        const eggType = eggTypes.find(type => type.id === eggTypeId);
        
        if (!eggType) {
            window.showToast('Egg type not found');
            return;
        }
        
        currentEggTypeId = eggTypeId;
        
        document.getElementById('editEggTypeId').value = eggType.id;
        document.getElementById('editEggTypeName').value = eggType.name;
        document.getElementById('editIncubationPeriod').value = eggType.incubationPeriod;
        document.getElementById('editCoefficientNumber').value = eggType.coefficient;
        document.getElementById('editEggTypeNotes').value = eggType.notes || '';
        
        showEditEggTypeModal();
    }
    // Add new egg type
    async function addEggType(eggTypeData) {
        try {
            console.log("Adding new egg type:", eggTypeData);
            await eggTypesCollection.add(eggTypeData);
            window.showToast('Egg type added successfully!');
            hideAddEggTypeModal();
            loadEggTypes();
        } catch (error) {
            window.showToast('Error adding egg type: ' + error.message);
            console.error('Error adding egg type:', error);
        }
    }

    // Update egg type
    async function updateEggType(eggTypeId, eggTypeData) {
        try {
            await eggTypesCollection.doc(eggTypeId).update(eggTypeData);
            window.showToast('Egg type updated successfully!');
            hideEditEggTypeModal();
            loadEggTypes();
        } catch (error) {
            window.showToast('Error updating egg type: ' + error.message);
            console.error('Error updating egg type:', error);
        }
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
    // Back button behavior for egg management page
    const originalBackButtonClick = document.getElementById('backButton').onclick;
    document.getElementById('backButton').onclick = function() {
        if (window.currentPage === 'eggManagement') {
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show home page
            document.getElementById('homePage').classList.add('active');
            document.getElementById('backButton').style.display = 'none';
            document.getElementById('addEggButton').style.display = 'flex';
            
            // Update current page
            window.previousPage = window.currentPage;
            window.currentPage = 'home';
        } else if (originalBackButtonClick) {
            // Use original behavior for other pages
            originalBackButtonClick();
        }
    };

    // Event Listeners for Egg Management Page
    addEggTypeBtn.addEventListener('click', showAddEggTypeModal);
    addFirstEggTypeBtn.addEventListener('click', showAddEggTypeModal);
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
            incubationPeriod: parseInt(document.getElementById('incubationPeriod').value),
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
            incubationPeriod: parseInt(document.getElementById('editIncubationPeriod').value),
            coefficient: coefficientValue.toFixed(9),
            notes: document.getElementById('editEggTypeNotes').value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await updateEggType(eggTypeId, updatedEggType);
    });
    // Update the add egg form to include egg type selection
    function updateAddEggForm() {
        // Get the egg type input field
        const eggTypeInput = document.getElementById('eggType');
        if (!eggTypeInput) return; // Exit if element doesn't exist
        
        const eggTypeFormGroup = eggTypeInput.parentElement;
        
        // Create new select element
        const selectContainer = document.createElement('div');
        selectContainer.className = 'form-group';
        selectContainer.innerHTML = `
            <label class="form-label" for="eggTypeSelect">Egg Type</label>
            <select id="eggTypeSelect" class="form-input" required>
                <option value="">Select an egg type</option>
            </select>
        `;
        
        // Replace the original input with the select
        eggTypeFormGroup.parentNode.replaceChild(selectContainer, eggTypeFormGroup);
        
        // Same for edit form
        const editEggTypeInput = document.getElementById('editEggType');
        if (!editEggTypeInput) return; // Exit if element doesn't exist
        
        const editEggTypeFormGroup = editEggTypeInput.parentElement;
        
        const editSelectContainer = document.createElement('div');
        editSelectContainer.className = 'form-group';
        editSelectContainer.innerHTML = `
            <label class="form-label" for="editEggTypeSelect">Egg Type</label>
            <select id="editEggTypeSelect" class="form-input" required>
                <option value="">Select an egg type</option>
            </select>
        `;
        
        editEggTypeFormGroup.parentNode.replaceChild(editSelectContainer, editEggTypeFormGroup);
        
        // Add event listener to update incubation days when egg type is selected
        const newEggTypeSelect = document.getElementById('eggTypeSelect');
        if (newEggTypeSelect) {
            newEggTypeSelect.addEventListener('change', (e) => {
                const selectedEggTypeId = e.target.value;
                if (selectedEggTypeId) {
                    const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
                    if (selectedEggType) {
                        document.getElementById('incubationDays').value = selectedEggType.incubationPeriod;
                    }
                }
            });
        }
        
        const newEditEggTypeSelect = document.getElementById('editEggTypeSelect');
        if (newEditEggTypeSelect) {
            newEditEggTypeSelect.addEventListener('change', (e) => {
                const selectedEggTypeId = e.target.value;
                if (selectedEggTypeId) {
                    const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
                    if (selectedEggType) {
                        document.getElementById('editIncubationDays').value = selectedEggType.incubationPeriod;
                    }
                }
            });
        }
    }

    // Initialize the egg management feature
    async function init() {
        try {
            console.log("Initializing egg management system...");
            addNavigation();
            
            // Wait a bit for the DOM to be fully updated
            setTimeout(() => {
                try {
                    updateAddEggForm();
                    populateEggTypeSelects();
                    setupFormHandlers();
                } catch (error) {
                    console.error('Error initializing egg type selects:', error);
                }
            }, 1000);
            
            // Setup listeners for egg button clicks
            const addEggButton = document.getElementById('addEggButton');
            if (addEggButton) {
                const originalClick = addEggButton.onclick;
                addEggButton.onclick = function() {
                    if (originalClick) originalClick();
                    setTimeout(populateEggTypeSelects, 500);
                };
            }
            
            const addFirstEggBtn = document.getElementById('addFirstEggBtn');
            if (addFirstEggBtn) {
                const originalClick = addFirstEggBtn.onclick;
                addFirstEggBtn.onclick = function() {
                    if (originalClick) originalClick();
                    setTimeout(populateEggTypeSelects, 500);
                };
            }
            
            console.log("Egg management system initialized successfully!");
        } catch (error) {
            console.error("Error initializing egg management system:", error);
        }
    }

    // Start initialization
    init();
});
