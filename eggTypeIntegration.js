// eggTypeIntegration.js - Integrates egg types with the main egg functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Type Integration module initializing...");
    
    // DOM Elements
    const settingsLink = document.getElementById('settingsLink');
    
    // Setup settings link
    if (settingsLink) {
        settingsLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'management.html';
        });
    }
    
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
    }

    // Populate egg type select dropdowns
    async function populateEggTypeSelects() {
        // Load egg types from Firebase
        const eggTypesCollection = window.db.collection('eggTypes');
        const snapshot = await eggTypesCollection.orderBy('name').get();
        const eggTypes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
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
        
        return eggTypes;
    }

    // Setup form handlers for egg creation and editing
    function setupFormHandlers() {
        const addEggForm = document.getElementById('addEggForm');
        const editEggForm = document.getElementById('editEggForm');
        const editEggBtn = document.getElementById('editEggBtn');
        
        if (addEggForm) {
            const originalAddEggFormSubmit = addEggForm.onsubmit;
            addEggForm.onsubmit = async function(e) {
                e.preventDefault();
                
                const eggTypeSelect = document.getElementById('eggTypeSelect');
                if (eggTypeSelect) {
                    const selectedEggTypeId = eggTypeSelect.value;
                    if (selectedEggTypeId) {
                        // Load egg types to get the selected one
                        const eggTypesCollection = window.db.collection('eggTypes');
                        const doc = await eggTypesCollection.doc(selectedEggTypeId).get();
                        const selectedEggType = { id: doc.id, ...doc.data() };
                        
                        const weightValue = parseFloat(document.getElementById('eggWeight').value);
                        const formattedWeight = weightValue.toFixed(2);
                        
                        const newEgg = {
                            name: document.getElementById('eggName').value,
                            typeId: selectedEggTypeId,
                            type: selectedEggType.name,
                            weight: formattedWeight,
                            coefficient: selectedEggType.coefficient,
                            incubationStart: document.getElementById('incubationStart').value,
                            incubationDays: document.getElementById('incubationDays').value,
                            notes: document.getElementById('eggNotes').value || '',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        try {
                            await window.eggsCollection.add(newEgg);
                            window.showToast('Egg added successfully!');
                            window.navigateTo('home');
                            window.loadEggs();
                            addEggForm.reset();
                        } catch (error) {
                            window.showToast('Error adding egg: ' + error.message);
                            console.error('Error adding egg:', error);
                        }
                    } else {
                        window.showToast('Please select an egg type');
                    }
                } else if (originalAddEggFormSubmit) {
                    // Fall back to original handler if select doesn't exist yet
                    originalAddEggFormSubmit.call(this, e);
                }
            };
        }
        
        if (editEggForm) {
            const originalEditEggFormSubmit = editEggForm.onsubmit;
            editEggForm.onsubmit = async function(e) {
                e.preventDefault();
                
                const editEggTypeSelect = document.getElementById('editEggTypeSelect');
                if (editEggTypeSelect) {
                    const selectedEggTypeId = editEggTypeSelect.value;
                    if (selectedEggTypeId) {
                        // Load egg types to get the selected one
                        const eggTypesCollection = window.db.collection('eggTypes');
                        const doc = await eggTypesCollection.doc(selectedEggTypeId).get();
                        const selectedEggType = { id: doc.id, ...doc.data() };
                        
                        const eggId = document.getElementById('editEggId').value;
                        
                        const weightValue = parseFloat(document.getElementById('editEggWeight').value);
                        const formattedWeight = weightValue.toFixed(2);
                        
                        const updatedEgg = {
                            name: document.getElementById('editEggName').value,
                            typeId: selectedEggTypeId,
                            type: selectedEggType.name,
                            weight: formattedWeight,
                            coefficient: selectedEggType.coefficient,
                            incubationStart: document.getElementById('editIncubationStart').value,
                            incubationDays: document.getElementById('editIncubationDays').value,
                            notes: document.getElementById('editEggNotes').value || '',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        try {
                            await window.eggsCollection.doc(eggId).update(updatedEgg);
                            window.showToast('Egg updated successfully!');
                            await window.loadEggs();
                            window.showEggDetails(eggId);
                            window.navigateTo('eggDetails');
                        } catch (error) {
                            window.showToast('Error updating egg: ' + error.message);
                            console.error('Error updating egg:', error);
                        }
                    } else {
                        window.showToast('Please select an egg type');
                    }
                } else if (originalEditEggFormSubmit) {
                    // Fall back to original handler if select doesn't exist yet
                    originalEditEggFormSubmit.call(this, e);
                }
            };
        }
        
        if (editEggBtn) {
            const originalEditBtnClick = editEggBtn.onclick;
            editEggBtn.onclick = function() {
                const egg = window.eggs.find(egg => egg.id === window.currentEggId);
                
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
                
                window.navigateTo('editEgg');
            };
        }
    }

    // Initialize the integration
    function initIntegration() {
        // Update forms to use egg type selection
        updateAddEggForm();
        
        // Set up event handlers
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
        
        // Set up form handlers
        setupFormHandlers();
    }

    // Start initialization after a short delay to ensure other modules are loaded
    setTimeout(initIntegration, 500);
});
