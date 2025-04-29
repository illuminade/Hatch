// eggWeightTracking.js - Handles egg weight tracking and calculations
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    let dailyWeightTable = null;
    let dailyWeightTableBody = null;
    let updateWeightsBtn = null;
    let currentEggData = null;
    
    // Constants
    const DATE_FORMAT_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric' };
    
    // Initialize the module
    function initializeWeightTracking() {
        // Get references to DOM elements
        dailyWeightTable = document.getElementById('dailyWeightTable');
        dailyWeightTableBody = document.getElementById('dailyWeightTableBody');
        
        // Create and add the update weights button
        createUpdateWeightsButton();
        
        // Listen for custom events
        document.addEventListener('eggDetailsLoaded', handleEggDetailsLoaded);
    }
    
    // Create and add the update weights button
    function createUpdateWeightsButton() {
        // Check if the button already exists
        if (document.getElementById('updateWeightsBtn')) {
            return;
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'update-weights-container';
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.marginTop = '15px';
        
        // Create the button
        updateWeightsBtn = document.createElement('button');
        updateWeightsBtn.id = 'updateWeightsBtn';
        updateWeightsBtn.className = 'btn btn-primary';
        updateWeightsBtn.innerHTML = '<i class="fas fa-save"></i> Update All Weights';
        updateWeightsBtn.addEventListener('click', saveAllWeights);
        
        // Add button to container
        buttonContainer.appendChild(updateWeightsBtn);
        
        // Add container after the weight table
        if (dailyWeightTable && dailyWeightTable.parentNode) {
            dailyWeightTable.parentNode.insertBefore(buttonContainer, dailyWeightTable.nextSibling);
        }
    }
    
    // Handle when egg details are loaded
    function handleEggDetailsLoaded(event) {
        const eggId = event.detail.eggId;
        const egg = event.detail.eggData;
        
        if (!egg) return;
        
        // Store current egg data for later use
        currentEggData = egg;
        
        // Initialize daily weights if they don't exist or are empty
        if (!egg.dailyWeights || egg.dailyWeights.length === 0) {
            initializeDailyWeights(eggId, egg);
        } else {
            // Render the daily weights table
            renderDailyWeightsTable(egg);
        }
    }
    
    // Initialize daily weights for a new or existing egg
    function initializeDailyWeights(eggId, egg) {
        const initialWeight = parseFloat(egg.weight);
        const incubationDays = parseInt(egg.incubationDays);
        const startDate = new Date(egg.incubationStart);
        
        // Extract midHumidityLoss, removing '%' if present
        let midHumidityLoss;
        if (egg.midHumidityLoss) {
            midHumidityLoss = parseFloat(egg.midHumidityLoss.replace('%', ''));
        } else {
            midHumidityLoss = 12; // Default value if not set
        }
        
        // Calculate daily weight loss
        const totalWeightLoss = initialWeight * (midHumidityLoss / 100);
        const dailyWeightLoss = totalWeightLoss / incubationDays;
        
        // Create daily weights array
        const dailyWeights = [];
        
        for (let day = 0; day <= incubationDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            
            const targetWeight = initialWeight - (dailyWeightLoss * day);
            
            dailyWeights.push({
                day: day,
                date: currentDate.toISOString().split('T')[0],
                weight: day === 0 ? initialWeight : null,
                targetWeight: parseFloat(targetWeight.toFixed(2))
            });
        }
        
        // Save the daily weights to the database
        window.eggsCollection.doc(eggId).update({
            dailyWeights: dailyWeights
        }).then(() => {
            // Update the local egg object and render the table
            const eggIndex = window.eggs.findIndex(e => e.id === eggId);
            if (eggIndex !== -1) {
                window.eggs[eggIndex].dailyWeights = dailyWeights;
                currentEggData = window.eggs[eggIndex];
                renderDailyWeightsTable(window.eggs[eggIndex]);
            }
        }).catch(error => {
            window.showToast('Error initializing weight tracking');
        });
    }
    
    // Render the daily weights table
    function renderDailyWeightsTable(egg) {
        if (!dailyWeightTableBody || !Array.isArray(egg.dailyWeights)) return;
        
        // Clear the table body
        dailyWeightTableBody.innerHTML = '';
        
        // Add rows for each day
        egg.dailyWeights.forEach((dayData, index) => {
            const row = document.createElement('tr');
            row.className = 'weight-row';
            row.dataset.day = dayData.day;
            
            // Format the date
            const dateObj = new Date(dayData.date);
            const formattedDate = dateObj.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
            
            // Calculate if there's a deviation between actual and target weight
            let weightClassname = '';
            if (dayData.weight !== null) {
                const deviation = dayData.weight - dayData.targetWeight;
                if (Math.abs(deviation) > (dayData.targetWeight * 0.05)) { // More than 5% deviation
                    weightClassname = deviation > 0 ? 'weight-deviation-high' : 'weight-deviation-low';
                }
            }
            
            // Create the row content with clickable weight cell
            row.innerHTML = `
                <td>${dayData.day}</td>
                <td>${formattedDate}</td>
                <td class="editable-weight" data-day="${dayData.day}">
                    <span class="weight-display ${weightClassname}">${dayData.weight !== null ? dayData.weight : 'Click to add'}</span>
                </td>
                <td>${dayData.targetWeight.toFixed(2)} g</td>
            `;
            
            // Add the row to the table
            dailyWeightTableBody.appendChild(row);
        });
        
        // Add click event to editable weight cells
        const editableCells = dailyWeightTableBody.querySelectorAll('.editable-weight');
        editableCells.forEach(cell => {
            cell.addEventListener('click', makeWeightCellEditable);
        });
        
        // Make sure the update button is visible
        if (updateWeightsBtn) {
            updateWeightsBtn.style.display = 'inline-flex';
        }
    }
    
    // Make a weight cell editable on click
    function makeWeightCellEditable(e) {
        // Don't do anything if we're already editing
        if (e.currentTarget.querySelector('input')) {
            return;
        }
        
        const day = parseInt(e.currentTarget.dataset.day);
        const displaySpan = e.currentTarget.querySelector('.weight-display');
        const currentValue = displaySpan.textContent;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'weight-input';
        input.id = `weight-day-${day}`;
        input.step = '0.01';
        input.min = '0';
        input.value = currentValue !== 'Click to add' ? currentValue : '';
        input.placeholder = 'Enter weight';
        
        // Replace span with input
        displaySpan.style.display = 'none';
        e.currentTarget.appendChild(input);
        
        // Focus the input
        input.focus();
        
        // Add event listeners for input
        input.addEventListener('blur', function() {
            // When input loses focus, restore display but with updated value if entered
            finishWeightEditing(e.currentTarget, input, displaySpan);
        });
        
        input.addEventListener('keypress', function(e) {
            // Submit on Enter key
            if (e.key === 'Enter') {
                e.preventDefault();
                finishWeightEditing(e.currentTarget, input, displaySpan);
            }
        });
    }
    
    // Finish weight editing, update display
    function finishWeightEditing(cell, input, displaySpan) {
        if (input.value) {
            // Format value to 2 decimal places
            const formattedValue = parseFloat(input.value).toFixed(2);
            displaySpan.textContent = formattedValue;
            
            // Mark cell as having unsaved changes
            cell.classList.add('unsaved-changes');
        } else {
            // If no value, restore original text
            displaySpan.textContent = 'Click to add';
        }
        
        // Show display span and remove input
        displaySpan.style.display = '';
        cell.removeChild(input);
    }
    
    // Save all weights
    function saveAllWeights() {
        if (!currentEggData || !currentEggData.id) {
            window.showToast('No egg data available');
            return;
        }
        
        const eggId = currentEggData.id;
        
        // Make a direct reference to the current egg data to avoid any reference issues
        if (!Array.isArray(currentEggData.dailyWeights)) {
            window.showToast('Error: Weight data not available');
            return;
        }
        
        // Create a copy of the dailyWeights array to avoid reference issues
        const updatedDailyWeights = JSON.parse(JSON.stringify(currentEggData.dailyWeights));
        let hasChanges = false;
        
        // Go through each editable cell and check for updates
        const editableCells = dailyWeightTableBody.querySelectorAll('.editable-weight');
        editableCells.forEach(cell => {
            const day = parseInt(cell.dataset.day);
            const displaySpan = cell.querySelector('.weight-display');
            const weightText = displaySpan.textContent;
            
            // Only update if there's a valid weight and not the placeholder
            if (weightText && weightText !== 'Click to add') {
                const newWeight = parseFloat(weightText);
                const formattedWeight = parseFloat(newWeight.toFixed(2));
                
                // Check if the weight has changed
                if (updatedDailyWeights[day].weight !== formattedWeight) {
                    updatedDailyWeights[day].weight = formattedWeight;
                    hasChanges = true;
                }
            }
        });
        
        // Only update if there are changes
        if (hasChanges) {
            // Update the database
            window.eggsCollection.doc(eggId).update({
                dailyWeights: updatedDailyWeights
            }).then(() => {
                window.showToast('Weights updated successfully');
                
                // Update the current egg data
                currentEggData.dailyWeights = updatedDailyWeights;
                
                // Update the global eggs array
                const eggIndex = window.eggs.findIndex(e => e.id === eggId);
                if (eggIndex !== -1) {
                    window.eggs[eggIndex].dailyWeights = updatedDailyWeights;
                }
                
                // Re-render the weight table with updated data
                renderDailyWeightsTable(currentEggData);
            }).catch(error => {
                window.showToast('Error updating weights: ' + (error.message || 'Unknown error'));
            });
        } else {
            window.showToast('No changes to update');
        }
    }
    
    // Make functions available globally
    window.eggWeightTracking = {
        initializeDailyWeights,
        renderDailyWeightsTable,
        saveAllWeights
    };
    
    // Initialize the module
    initializeWeightTracking();
});
