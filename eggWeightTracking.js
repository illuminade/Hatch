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
            
            // Create the row content
            row.innerHTML = `
                <td>${dayData.day}</td>
                <td>${formattedDate}</td>
                <td>
                    <input type="number" class="weight-input ${weightClassname}" 
                           id="weight-day-${dayData.day}"
                           value="${dayData.weight !== null ? dayData.weight : ''}" 
                           placeholder="Enter weight" step="0.01" min="0">
                </td>
                <td>${dayData.targetWeight.toFixed(2)} g</td>
            `;
            
            // Add the row to the table
            dailyWeightTableBody.appendChild(row);
        });
        
        // Make rows clickable to focus on the input
        const rows = dailyWeightTableBody.querySelectorAll('.weight-row');
        rows.forEach(row => {
            row.addEventListener('click', function(e) {
                // Don't trigger if clicking on the input
                if (e.target.tagName !== 'INPUT') {
                    const day = parseInt(this.dataset.day);
                    const input = document.getElementById(`weight-day-${day}`);
                    if (input) {
                        input.focus();
                    }
                }
            });
        });
        
        // Make sure the update button is visible
        if (updateWeightsBtn) {
            updateWeightsBtn.style.display = 'inline-flex';
        }
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
        
        // Go through each day and check for updates
        for (let i = 0; i < updatedDailyWeights.length; i++) {
            const input = document.getElementById(`weight-day-${i}`);
            if (input && input.value) {
                const newWeight = parseFloat(input.value);
                const formattedWeight = parseFloat(newWeight.toFixed(2));
                
                // Check if the weight has changed
                if (updatedDailyWeights[i].weight !== formattedWeight) {
                    updatedDailyWeights[i].weight = formattedWeight;
                    hasChanges = true;
                }
            }
        }
        
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
