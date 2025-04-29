// eggWeightInterpolation.js - Handles interpolation of unknown weights between known weight points
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const INTERPOLATED_WEIGHT_CLASS = 'interpolated-weight';
    
    // Initialize the module
    function initializeWeightInterpolation() {
        // Check if weight tracking module is loaded
        if (!window.eggWeightTracking) {
            // Try again in 500ms
            setTimeout(initializeWeightInterpolation, 500);
            return;
        }
        
        // Override the saveAllWeights function to include interpolation
        if (typeof window.eggWeightTracking.saveAllWeights === 'function') {
            const originalSaveAllWeights = window.eggWeightTracking.saveAllWeights;
            
            // Replace the function
            window.eggWeightTracking.saveAllWeights = async function() {
                try {
                    // First call the original function to save entered weights
                    await originalSaveAllWeights();
                    
                    // Then perform interpolation
                    await interpolateUnknownWeights();
                } catch (error) {
                    window.showToast('Error updating weights: ' + (error.message || 'Unknown error'));
                }
            };
        }
        
        // Add styles for interpolated weights
        addInterpolationStyles();
        
        // Override the render function
        overrideRenderFunction();
    }
    
    // Add CSS styles for interpolated weights
    function addInterpolationStyles() {
        // Check if styles already exist to avoid duplicates
        if (document.getElementById('interpolated-weight-styles')) {
            return;
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'interpolated-weight-styles';
        styleElement.textContent = `
            .${INTERPOLATED_WEIGHT_CLASS} {
                color: #777;
                font-style: italic;
            }
            
            .${INTERPOLATED_WEIGHT_CLASS}.weight-deviation-high {
                color: rgba(255, 59, 48, 0.7);
            }
            
            .${INTERPOLATED_WEIGHT_CLASS}.weight-deviation-low {
                color: rgba(76, 217, 100, 0.7);
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Main interpolation function
    async function interpolateUnknownWeights() {
        // Ensure we have current egg data
        if (!window.currentEggId || !window.eggs) {
            return;
        }
        
        // Get the current egg data
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) {
            return;
        }
        
        // Create a copy of the dailyWeights array to avoid reference issues
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Find days with known weights (user-entered) - exclude interpolated weights
        const knownWeightDays = updatedWeights
            .filter(day => day.weight !== null && !day.interpolated)
            .map(day => ({
                day: day.day,
                weight: parseFloat(day.weight)
            }));
        
        // Make sure we have at least one known weight
        if (knownWeightDays.length === 0) {
            return;
        }
        
        // Sort by day to ensure proper order
        knownWeightDays.sort((a, b) => a.day - b.day);
        
        // Reset all interpolated flags before recalculating
        updatedWeights.forEach(day => {
            if (day.interpolated) {
                day.weight = null;
                day.interpolated = false;
            }
        });
        
        // Calculate interpolation between known points
        calculateInterpolation(updatedWeights, knownWeightDays);
        
        // Save the updated weights to Firebase
        try {
            await window.eggsCollection.doc(currentEgg.id).update({
                dailyWeights: updatedWeights
            });
            
            // Update the current egg data
            currentEgg.dailyWeights = updatedWeights;
            
            // Update the global eggs array
            const eggIndex = window.eggs.findIndex(e => e.id === currentEgg.id);
            if (eggIndex !== -1) {
                window.eggs[eggIndex].dailyWeights = updatedWeights;
            }
            
            // Re-render the weight table with updated data
            renderInterpolatedWeights(currentEgg);
            
            window.showToast('Weights updated with interpolation');
        } catch (error) {
            window.showToast('Error updating weights: ' + (error.message || 'Unknown error'));
        }
    }
    
    // Calculate interpolation between known weights
    function calculateInterpolation(dailyWeights, knownWeightDays) {
        const totalDays = dailyWeights.length - 1; // Total incubation days
        
        // Loop through segments between known weights
        for (let i = 0; i < knownWeightDays.length - 1; i++) {
            const startPoint = knownWeightDays[i];
            const endPoint = knownWeightDays[i + 1];
            
            // Calculate weight difference and days between
            const weightDiff = endPoint.weight - startPoint.weight;
            const daysDiff = endPoint.day - startPoint.day;
            
            // Calculate daily weight loss rate for this segment
            const dailyLossRate = daysDiff > 0 ? weightDiff / daysDiff : 0;
            
            // Interpolate weights for days between these two known points
            for (let day = startPoint.day + 1; day < endPoint.day; day++) {
                const daysFromStart = day - startPoint.day;
                const interpolatedWeight = startPoint.weight + (dailyLossRate * daysFromStart);
                const formattedWeight = parseFloat(interpolatedWeight.toFixed(2));
                
                // Update the weight in the dailyWeights array and mark as interpolated
                if (day < dailyWeights.length) {
                    dailyWeights[day].weight = formattedWeight;
                    dailyWeights[day].interpolated = true;
                }
            }
        }
        
        // Handle interpolation for days after the last known weight point
        if (knownWeightDays.length > 0) {
            const lastKnownPoint = knownWeightDays[knownWeightDays.length - 1];
            
            // If the last known point is not the initial weight (to avoid division by zero)
            if (lastKnownPoint.day > 0) {
                // Calculate average daily weight loss from initial weight to last known weight
                const initialWeight = knownWeightDays[0].weight;
                const totalWeightLoss = initialWeight - lastKnownPoint.weight;
                const averageDailyLoss = totalWeightLoss / lastKnownPoint.day;
                
                // Apply this rate to all remaining days
                for (let day = lastKnownPoint.day + 1; day <= totalDays; day++) {
                    const daysAfterLast = day - lastKnownPoint.day;
                    const interpolatedWeight = lastKnownPoint.weight - (averageDailyLoss * daysAfterLast);
                    
                    // Ensure weight doesn't go below zero
                    const finalWeight = Math.max(0, interpolatedWeight);
                    const formattedWeight = parseFloat(finalWeight.toFixed(2));
                    
                    // Update the weight and mark as interpolated
                    if (day < dailyWeights.length) {
                        dailyWeights[day].weight = formattedWeight;
                        dailyWeights[day].interpolated = true;
                    }
                }
            }
        }
    }
    
    // Custom render function to display interpolated weights with different style
    function renderInterpolatedWeights(egg) {
        // Get table body element
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody) return;
        
        // Update each weight cell to show interpolation styling
        egg.dailyWeights.forEach(dayData => {
            // Find the cell for this day
            const cell = tableBody.querySelector(`.editable-weight[data-day="${dayData.day}"]`);
            if (!cell) return;
            
            const displaySpan = cell.querySelector('.weight-display');
            if (!displaySpan) return;
            
            // If weight exists, update the display
            if (dayData.weight !== null) {
                // Update the display text
                displaySpan.textContent = dayData.weight;
                
                // Add or remove interpolation class based on whether it's interpolated
                if (dayData.interpolated) {
                    displaySpan.classList.add(INTERPOLATED_WEIGHT_CLASS);
                } else {
                    displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS);
                }
                
                // Calculate deviation for color coding
                const deviation = dayData.weight - dayData.targetWeight;
                
                // Reset classes
                displaySpan.classList.remove('weight-deviation-high', 'weight-deviation-low');
                
                // Add deviation classes if significant (more than 5%)
                if (Math.abs(deviation) > (dayData.targetWeight * 0.05)) {
                    const deviationClass = deviation > 0 ? 'weight-deviation-high' : 'weight-deviation-low';
                    displaySpan.classList.add(deviationClass);
                }
            } else {
                // If no weight, display placeholder
                displaySpan.textContent = 'Click to add';
                displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
            }
        });
    }
    
    // Override the original renderDailyWeightsTable function to handle interpolated weights
    function overrideRenderFunction() {
        if (window.eggWeightTracking && window.eggWeightTracking.renderDailyWeightsTable) {
            const originalRender = window.eggWeightTracking.renderDailyWeightsTable;
            
            window.eggWeightTracking.renderDailyWeightsTable = function(egg) {
                // First call the original render function
                originalRender.call(window.eggWeightTracking, egg);
                
                // Then apply our custom styling for interpolated weights
                renderInterpolatedWeights(egg);
            };
        }
    }
    
    // Handle when egg details are loaded - apply interpolation styling
    function handleEggDetailsLoaded(event) {
        const egg = event.detail.eggData;
        if (!egg) return;
        
        // Apply interpolation styling after a short delay to ensure table is rendered
        setTimeout(() => renderInterpolatedWeights(egg), 100);
    }
    
    // Listen for egg details loaded event
    document.addEventListener('eggDetailsLoaded', handleEggDetailsLoaded);
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        interpolateUnknownWeights,
        renderInterpolatedWeights
    };
    
    // Start initialization
    setTimeout(initializeWeightInterpolation, 300);
});
