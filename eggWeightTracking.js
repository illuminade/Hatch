// eggWeightTracking.js - Handles egg weight tracking and calculations
document.addEventListener('DOMContentLoaded', function() {
    console.log("Egg Weight Tracking module initializing...");
    
    // DOM Elements
    let dailyWeightTable = null;
    let dailyWeightTableBody = null;
    
    // Constants
    const DATE_FORMAT_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric' };
    
    // Initialize the module
    function initializeWeightTracking() {
        // Get references to DOM elements
        dailyWeightTable = document.getElementById('dailyWeightTable');
        dailyWeightTableBody = document.getElementById('dailyWeightTableBody');
        
        // Listen for custom events
        document.addEventListener('eggDetailsLoaded', handleEggDetailsLoaded);
    }
    
    // Handle when egg details are loaded
    function handleEggDetailsLoaded(event) {
        const eggId = event.detail.eggId;
        const egg = event.detail.eggData;
        
        if (!egg) return;
        
        // Initialize daily weights if they don't exist
        if (!egg.dailyWeights) {
            initializeDailyWeights(eggId, egg);
        } else {
            // Render the daily weights table
            renderDailyWeightsTable(egg);
        }
    }
    
    // Initialize daily weights for a new or existing egg
    function initializeDailyWeights(eggId, egg) {
        console.log("Initializing daily weights for egg:", eggId);
        
        const initialWeight = parseFloat(egg.weight);
        const incubationDays = parseInt(egg.incubationDays);
        const startDate = new Date(egg.incubationStart);
        
        // Extract midHumidityLoss, removing '%' if present
        let midHumidityLoss;
        if (egg.midHumidityLoss) {
            midHumidityLoss = parseFloat(egg.midHumidityLoss.replace('%', ''));
        } else {
            midHumidityLoss = 12; // Default value if not set
            console.warn("Mid humidity loss not set, using default of 12%");
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
            console.log("Daily weights initialized successfully");
            // Update the local egg object and render the table
            egg.dailyWeights = dailyWeights;
            renderDailyWeightsTable(egg);
        }).catch(error => {
            console.error("Error initializing daily weights:", error);
            window.showToast('Error initializing weight tracking');
        });
    }
    
    // Render the daily weights table
    function renderDailyWeightsTable(egg) {
        if (!dailyWeightTableBody) return;
        
        // Clear the table body
        dailyWeightTableBody.innerHTML = '';
        
        // Add rows for each day
        egg.dailyWeights.forEach((dayData, index) => {
            const row = document.createElement('tr');
            
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
                    <input type="number" class="weight-input ${weightClassname}" data-day="${dayData.day}" 
                           value="${dayData.weight !== null ? dayData.weight : ''}" 
                           placeholder="Enter weight" step="0.01" min="0">
                </td>
                <td>${dayData.targetWeight.toFixed(2)} g</td>
            `;
            
            // Add the row to the table
            dailyWeightTableBody.appendChild(row);
        });
        
        // Add event listeners to the weight inputs
        const weightInputs = dailyWeightTableBody.querySelectorAll('.weight-input');
        weightInputs.forEach(input => {
            // Log to verify inputs are found
            console.log(`Adding event listeners to input for day ${input.dataset.day}`);

            // Add both blur and change events to catch all user interactions
            input.addEventListener('blur', function() {
                console.log(`Blur event triggered for day ${this.dataset.day} with value ${this.value}`);
                if (this.value) {
                    updateEggWeight(egg.id, parseInt(this.dataset.day), parseFloat(this.value));
                }
            });
            
            input.addEventListener('change', function() {
                console.log(`Change event triggered for day ${this.dataset.day} with value ${this.value}`);
                if (this.value) {
                    updateEggWeight(egg.id, parseInt(this.dataset.day), parseFloat(this.value));
                }
            });

            // Also catch the enter key being pressed
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    console.log(`Enter key pressed for day ${this.dataset.day} with value ${this.value}`);
                    e.preventDefault();
                    if (this.value) {
                        updateEggWeight(egg.id, parseInt(this.dataset.day), parseFloat(this.value));
                        // Remove focus from input
                        this.blur();
                    }
                }
            });
        });
    }
    
    // Update a specific day's weight
    function updateEggWeight(eggId, day, weight) {
        // Log input parameters
        console.log(`updateEggWeight called with: eggId=${eggId}, day=${day}, weight=${weight}`);
        
        // Find the egg
        const egg = window.eggs.find(e => e.id === eggId);
        if (!egg || !egg.dailyWeights) {
            console.error("Egg or dailyWeights not found:", egg);
            return;
        }
        
        // Update the local dailyWeights array
        egg.dailyWeights[day].weight = weight;
        console.log(`Local dailyWeights updated for day ${day}`);
        
        // Create the update path
        const updatePath = `dailyWeights.${day}.weight`;
        console.log(`Firebase update path: ${updatePath}`);
        
        // Update the database
        window.eggsCollection.doc(eggId).update({
            [updatePath]: weight
        }).then(() => {
            console.log(`Successfully updated weight for day ${day} to ${weight}g in Firebase`);
            window.showToast('Weight updated successfully');
            
            // Refresh the table to update any visual indicators
            renderDailyWeightsTable(egg);
        }).catch(error => {
            console.error("Error updating weight:", error.code, error.message);
            window.showToast('Error updating weight: ' + error.message);
        });
    }
    
    // Make functions available globally
    window.eggWeightTracking = {
        initializeDailyWeights,
        renderDailyWeightsTable,
        updateEggWeight
    };
    
    // Initialize the module
    initializeWeightTracking();
});
