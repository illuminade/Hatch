// At the beginning of eggManagement.js
// Reference existing app variables and functions without redeclaring db
const navigateTo = window.navigateTo;
const showToast = window.showToast;
const loadEggs = window.loadEggs;
const showEggDetails = window.showEggDetails;
const eggs = window.eggs;
const currentEggId = window.currentEggId;
const addEggButton = window.addEggButton;
const addFirstEggBtn = window.addFirstEggBtn;
const backButton = window.backButton;
const eggsCollection = window.eggsCollection;

// Use the existing db object
const eggTypesCollection = window.db.collection('eggTypes');

// Initialize Firebase collection for egg types
const eggTypesCollection = db.collection('eggTypes');

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

// Add navigation to header
function addNavigation() {
    const header = document.querySelector('header');
    const navLink = document.createElement('a');
    navLink.className = 'nav-link';
    navLink.href = '#';
    navLink.innerHTML = '<i class="fas fa-cog"></i> Settings';
    navLink.id = 'settingsLink';
    header.appendChild(navLink);
    
    // Event listener for settings link
    navLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('eggManagement');
    });
}

// Load egg types from Firebase
async function loadEggTypes() {
    try {
        const snapshot = await eggTypesCollection.orderBy('name').get();
        eggTypes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderEggTypesList();
    } catch (error) {
        showToast('Error loading egg types: ' + error.message);
        console.error('Error loading egg types:', error);
    }
}

// Render egg types list
function renderEggTypesList() {
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
        showToast('Egg type not found');
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
        await eggTypesCollection.add(eggTypeData);
        showToast('Egg type added successfully!');
        hideAddEggTypeModal();
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

// Update navigation function to include egg management page
document.addEventListener('DOMContentLoaded', function() {
    // Make sure settings link works
    const settingsLink = document.getElementById('settingsLink');
    if (settingsLink) {
        settingsLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show egg management page
            document.getElementById('eggManagementPage').classList.add('active');
            backButton.style.display = 'flex';
            addEggButton.style.display = 'none';
            
            // Update current page
            window.previousPage = window.currentPage;
            window.currentPage = 'eggManagement';
        });
    }
});

// Update back button behavior
document.addEventListener('DOMContentLoaded', function() {
    // Original back button behavior
    const originalClick = backButton.onclick;
    
    // Override with new behavior
    backButton.onclick = function() {
        if (currentPage === 'eggManagement') {
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show home page
            document.getElementById('homePage').classList.add('active');
            backButton.style.display = 'none';
            addEggButton.style.display = 'flex';
            
            // Update current page
            previousPage = currentPage;
            currentPage = 'home';
        } else if (originalClick) {
            // Use original behavior for other pages
            originalClick.call(this);
        }
    };
});

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
    document.getElementById('eggTypeSelect').addEventListener('change', (e) => {
        const selectedEggTypeId = e.target.value;
        if (selectedEggTypeId) {
            const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
            if (selectedEggType) {
                document.getElementById('incubationDays').value = selectedEggType.incubationPeriod;
            }
        }
    });
    
    document.getElementById('editEggTypeSelect').addEventListener('change', (e) => {
        const selectedEggTypeId = e.target.value;
        if (selectedEggTypeId) {
            const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
            if (selectedEggType) {
                document.getElementById('editIncubationDays').value = selectedEggType.incubationPeriod;
            }
        }
    });
}

// Populate egg type select
async function populateEggTypeSelects() {
    await loadEggTypes();
    
    const eggTypeSelect = document.getElementById('eggTypeSelect');
    const editEggTypeSelect = document.getElementById('editEggTypeSelect');
    
    if (!eggTypeSelect || !editEggTypeSelect) return;
    
    // Clear existing options except the first one
    while (eggTypeSelect.options.length > 1) {
        eggTypeSelect.remove(1);
    }
    
    while (editEggTypeSelect.options.length > 1) {
        editEggTypeSelect.remove(1);
    }
    
    // Add options for each egg type
    eggTypes.forEach(eggType => {
        const option = document.createElement('option');
        option.value = eggType.id;
        option.textContent = eggType.name;
        eggTypeSelect.appendChild(option);
        
        const editOption = document.createElement('option');
        editOption.value = eggType.id;
        editOption.textContent = eggType.name;
        editEggTypeSelect.appendChild(editOption);
    });
}

// Update the addEggForm.addEventListener to use the selected egg type
const originalAddEggFormHandler = addEggForm.onsubmit;
addEggForm.onsubmit = async function(e) {
    e.preventDefault();
    
    const eggTypeSelect = document.getElementById('eggTypeSelect');
    if (eggTypeSelect) {
        const selectedEggTypeId = eggTypeSelect.value;
        if (selectedEggTypeId) {
            const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
            
            const weightValue = parseFloat(document.getElementById('eggWeight').value);
            const formattedWeight = weightValue.toFixed(2);
            
            const newEgg = {
                name: document.getElementById('eggName').value,
                typeId: selectedEggTypeId,
                type: selectedEggType.name,
                weight: formattedWeight,
                coefficient: selectedEggType.coefficient, // Store the coefficient
                incubationStart: document.getElementById('incubationStart').value,
                incubationDays: document.getElementById('incubationDays').value,
                notes: document.getElementById('eggNotes').value || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                await eggsCollection.add(newEgg);
                showToast('Egg added successfully!');
                navigateTo('home');
                loadEggs();
                addEggForm.reset();
            } catch (error) {
                showToast('Error adding egg: ' + error.message);
                console.error('Error adding egg:', error);
            }
        } else {
            showToast('Please select an egg type');
        }
    } else {
        // Fall back to original handler if select doesn't exist yet
        originalAddEggFormHandler.call(this, e);
    }
};

// Update the editEggForm.addEventListener to use the selected egg type
const originalEditEggFormHandler = editEggForm.onsubmit;
editEggForm.onsubmit = async function(e) {
    e.preventDefault();
    
    const editEggTypeSelect = document.getElementById('editEggTypeSelect');
    if (editEggTypeSelect) {
        const selectedEggTypeId = editEggTypeSelect.value;
        if (selectedEggTypeId) {
            const selectedEggType = eggTypes.find(type => type.id === selectedEggTypeId);
            const eggId = document.getElementById('editEggId').value;
            
            const weightValue = parseFloat(document.getElementById('editEggWeight').value);
            const formattedWeight = weightValue.toFixed(2);
            
            const updatedEgg = {
                name: document.getElementById('editEggName').value,
                typeId: selectedEggTypeId,
                type: selectedEggType.name,
                weight: formattedWeight,
                coefficient: selectedEggType.coefficient, // Store the coefficient
                incubationStart: document.getElementById('editIncubationStart').value,
                incubationDays: document.getElementById('editIncubationDays').value,
                notes: document.getElementById('editEggNotes').value || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                await eggsCollection.doc(eggId).update(updatedEgg);
                showToast('Egg updated successfully!');
                await loadEggs();
                showEggDetails(eggId);
                navigateTo('eggDetails');
            } catch (error) {
                showToast('Error updating egg: ' + error.message);
                console.error('Error updating egg:', error);
            }
        } else {
            showToast('Please select an egg type');
        }
    } else {
        // Fall back to original handler if select doesn't exist yet
        originalEditEggFormHandler.call(this, e);
    }
};

// Update the openEditModal function
const originalEditBtnHandler = editEggBtn.onclick;
editEggBtn.onclick = function() {
    const egg = eggs.find(egg => egg.id === currentEggId);
    
    document.getElementById('editEggId').value = egg.id;
    document.getElementById('editEggName').value = egg.name;
    
    const editEggTypeSelect = document.getElementById('editEggTypeSelect');
    if (editEggTypeSelect) {
        // Find the matching option and select it
        for (let i = 0; i < editEggTypeSelect.options.length; i++) {
            if (editEggTypeSelect.options[i].value === egg.typeId) {
                editEggTypeSelect.selectedIndex = i;
                break;
            }
        }
    } else {
        document.getElementById('editEggType').value = egg.type;
    }
    
    document.getElementById('editEggWeight').value = egg.weight;
    document.getElementById('editIncubationStart').value = egg.incubationStart;
    document.getElementById('editIncubationDays').value = egg.incubationDays;
    document.getElementById('editEggNotes').value = egg.notes || '';
    
    navigateTo('editEgg');
};

// Initialize egg management page
function initEggManagement() {
    addNavigation();
    loadEggTypes();
    
    // Wait a bit for the DOM to be fully updated
    setTimeout(() => {
        try {
            updateAddEggForm();
            populateEggTypeSelects();
        } catch (error) {
            console.error('Error initializing egg type selects:', error);
        }
    }, 1000);
}

// Add initialization to the existing init function
const originalInitApp = initApp;
initApp = async function() {
    await originalInitApp();
    initEggManagement();
};

// Add egg type selection refresh when adding an egg
const originalAddEggButtonHandler = addEggButton.onclick;
addEggButton.onclick = function() {
    originalAddEggButtonHandler();
    populateEggTypeSelects();
};

// Also refresh egg types when adding first egg
const originalAddFirstEggBtnHandler = addFirstEggBtn.onclick;
addFirstEggBtn.onclick = function() {
    originalAddFirstEggBtnHandler();
    populateEggTypeSelects();
};

// Modify showEggDetails to handle the coefficient
const originalShowEggDetails = showEggDetails;
showEggDetails = function(eggId) {
    const egg = eggs.find(egg => egg.id === eggId);
    
    if (!egg) {
        navigateTo('home');
        return;
    }
    
    currentEggId = eggId;
    
    const progress = calculateProgress(egg.incubationStart, egg.incubationDays);
    const daysRemaining = calculateDaysRemaining(egg.incubationStart, egg.incubationDays);
    const hatchDate = calculateHatchDate(egg.incubationStart, egg.incubationDays);
    
    // Format weight to always display with 2 decimal places
    const weightFormatted = parseFloat(egg.weight).toFixed(2);
    
    // Update UI with egg details (coefficient is NOT displayed here)
    document.getElementById('detailEggName').textContent = egg.name;
    document.getElementById('detailEggType').textContent = egg.type;
    document.getElementById('detailEggWeight').textContent = `${weightFormatted} grams`;
    document.getElementById('detailIncubationStart').textContent = formatDate(egg.incubationStart);
    document.getElementById('detailIncubationPeriod').textContent = `${egg.incubationDays} days`;
    document.getElementById('detailHatchDate').textContent = hatchDate;
    document.getElementById('detailProgressText').textContent = `${progress}%`;
    document.getElementById('detailDaysRemaining').textContent = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ready to hatch!';
    document.getElementById('detailNotes').textContent = egg.notes || 'No notes added.';
    
    // Update circular progress
    updateCircularProgress(progress);
    
    navigateTo('eggDetails');
};
