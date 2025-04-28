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
                        
                        // Get humidity loss values
                        const highHumidity = document.getElementById('highHumidityLoss').value;
                        const midHumidity = document.getElementById('midHumidityLoss').value;
                        const lowHumidity = document.getElementById('lowHumidityLoss').value;
                        
                        // Calculate initial dailyWeights array
                        const incubationDays = parseInt(document.getElementById('incubationDays').value);
                        const startDate = new Date(document.getElementById('incubationStart').value);
                        const totalWeightLoss = weightValue * (parseFloat(midHumidity) / 100);
                        const dailyWeightLoss = totalWeightLoss / incubationDays;
                        
                        // Create the dailyWeights array
                        const dailyWeights = [];
                        for (let day = 0; day <= incubationDays; day++) {
                            const currentDate = new Date(startDate);
                            currentDate.setDate(startDate.getDate() + day);
                            
                            const targetWeight = weightValue - (dailyWeightLoss * day);
                            
                            dailyWeights.push({
                                day: day,
                                date: currentDate.toISOString().split('T')[0],
                                weight: day === 0 ? weightValue : null,
                                targetWeight: parseFloat(targetWeight.toFixed(2))
                            });
                        }
                        
                        const newEgg = {
                            name: document.getElementById('eggName').value,
                            typeId: selectedEggTypeId,
                            type: selectedEggType.name,
                            weight: formattedWeight,
                            coefficient: selectedEggType.coefficient,
                            incubationStart: document.getElementById('incubationStart').value,
                            incubationDays: incubationDays,
                            highHumidityLoss: highHumidity + '%',
                            midHumidityLoss: midHumidity + '%',
                            lowHumidityLoss: lowHumidity + '%',
                            notes: document.getElementById('eggNotes').value || '',
                            dailyWeights: dailyWeights, // Add the dailyWeights array
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
                        
                        // Get the current egg to compare values
                        const currentEgg = window.eggs.find(egg => egg.id === eggId);
                        
                        const weightValue = parseFloat(document.getElementById('editEggWeight').value);
                        const formattedWeight = weightValue.toFixed(2);
                        
                        // Get humidity loss values
                        const highHumidity = document.getElementById('editHighHumidityLoss').value;
                        const midHumidity = document.getElementById('editMidHumidityLoss').value;
                        const lowHumidity = document.getElementById('editLowHumidityLoss').value;
                        
                        // Get incubation values
                        const incubationDays = parseInt(document.getElementById('editIncubationDays').value);
                        const incubationStart = document.getElementById('editIncubationStart').value;
                        
                        // Check if key values changed that would affect daily weights
                        const weightChanged = parseFloat(currentEgg.weight) !== weightValue;
                        const daysChanged = parseInt(currentEgg.incubationDays) !== incubationDays;
                        const startDateChanged = currentEgg.incubationStart !== incubationStart;
                        const midHumidityChanged = currentEgg.midHumidityLoss ? 
                            parseFloat(currentEgg.midHumidityLoss.replace('%', '')) !== parseFloat(midHumidity) : true;
                        
                        let dailyWeights = currentEgg.dailyWeights || [];
                        
                        // If any key values changed, recalculate the target weights
                        if (weightChanged || daysChanged || startDateChanged || midHumidityChanged || !dailyWeights.length) {
                            // Calculate updated dailyWeights array
                            const startDate = new Date(incubationStart);
                            const totalWeightLoss = weightValue * (parseFloat(midHumidity) / 100);
                            const dailyWeightLoss = totalWeightLoss / incubationDays;
                            
                            // Create new dailyWeights array while preserving existing weight entries
                            const newDailyWeights = [];
                            for (let day = 0; day <= incubationDays; day++) {
                                const currentDate = new Date(startDate);
                                currentDate.setDate(startDate.getDate() + day);
                                
                                const targetWeight = weightValue - (dailyWeightLoss * day);
                                
                                // Try to preserve existing weight entry if available
                                let existingWeight = null;
                                if (currentEgg.dailyWeights && day < currentEgg.dailyWeights.length) {
                                    existingWeight = currentEgg.dailyWeights[day].weight;
                                }
                                
                                // For day 0, always use the initial weight
                                const dayWeight = day === 0 ? weightValue : existingWeight;
                                
                                newDailyWeights.push({
                                    day: day,
                                    date: currentDate.toISOString().split('T')[0],
                                    weight: dayWeight,
                                    targetWeight: parseFloat(targetWeight.toFixed(2))
                                });
                            }
                            
                            dailyWeights = newDailyWeights;
                        }
                        
                        const updatedEgg = {
                            name: document.getElementById('editEggName').value,
                            typeId: selectedEggTypeId,
                            type: selectedEggType.name,
                            weight: formattedWeight,
                            coefficient: selectedEggType.coefficient,
                            incubationStart: incubationStart,
                            incubationDays: incubationDays,
                            highHumidityLoss: highHumidity + '%',
                            midHumidityLoss: midHumidity + '%',
                            lowHumidityLoss: lowHumidity + '%',
                            notes: document.getElementById('editEggNotes').value || '',
                            dailyWeights: dailyWeights, // Add the updated dailyWeights array
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
                
                // Set humidity loss values - remove % symbol if present
                if (egg.highHumidityLoss) {
                    document.getElementById('editHighHumidityLoss').value = egg.highHumidityLoss.replace('%', '');
                }
                if (egg.midHumidityLoss) {
                    document.getElementById('editMidHumidityLoss').value = egg.midHumidityLoss.replace('%', '');
                }
                if (egg.lowHumidityLoss) {
                    document.getElementById('editLowHumidityLoss').value = egg.lowHumidityLoss.replace('%', '');
                }
                
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
