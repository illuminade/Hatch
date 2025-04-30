// eggWeightInterpolation.js - Direct implementation for weight interpolation and removal
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const INTERPOLATED_WEIGHT_CLASS = 'interpolated-weight';
    
    // Add styles for interpolated weights
    const styleElement = document.createElement('style');
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
    
    // Initialize after a short delay
    setTimeout(initializeInterpolation, 500);
    
    // Initialize the interpolation functionality
    function initializeInterpolation() {
        // Only proceed if the weight tracking functionality is available
        if (!window.eggWeightTracking || !window.eggWeightTracking.saveAllWeights) {
            // Try again later if not ready
            setTimeout(initializeInterpolation, 500);
            return;
        }
        
        // Store a reference to the original save function
        const originalSaveWeights = window.eggWeightTracking.saveAllWeights;
        
        // Completely override the saveAllWeights function
        window.eggWeightTracking.saveAllWeights = async function() {
            // Get the current egg data
            if (!window.currentEggId || !window.eggs) {
                window.showToast('No egg data available');
                return;
            }
            
            const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
            if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) {
                window.showToast('Invalid egg data');
                return;
            }
            
            try {
                // Step 1: Collect all user-entered weights from the table
                // This includes any changes (added, modified, or removed weights)
                const updatedWeights = collectUserEnteredWeights(currentEgg.dailyWeights);
                
                // Step 2: Save the collected weights to the database
                await window.eggsCollection.doc(currentEggId).update({
                    dailyWeights: updatedWeights
                });
                
                // Step 3: Update the local egg data
                currentEgg.dailyWeights = updatedWeights;
                
                // Step 4: Update the global eggs array
                const eggIndex = window.eggs.findIndex(e => e.id === currentEggId);
                if (eggIndex !== -1) {
                    window.eggs[eggIndex].dailyWeights = updatedWeights;
                }
                
                // Step 5: Perform interpolation
                await runInterpolation();
                
                // Remove any "unsaved-changes" classes
                const unsavedCells = document.querySelectorAll('.unsaved-changes');
                unsavedCells.forEach(cell => {
                    cell.classList.remove('unsaved-changes');
                });
                
                window.showToast('Weights updated successfully');
            } catch (error) {
                window.showToast('Error updating weights: ' + (error.message || 'Unknown error'));
            }
        };
        
        // Listen for egg details loaded to apply styling
        document.addEventListener('eggDetailsLoaded', function(event) {
            setTimeout(function() {
                const egg = event.detail.eggData;
                if (egg && egg.dailyWeights) {
                    applyInterpolationStyling(egg);
                }
            }, 100);
        });
        
        // Override the finishWeightEditing function to properly handle empty inputs
        if (window.eggWeightTracking.finishWeightEditing) {
            const originalFinishEditing = window.eggWeightTracking.finishWeightEditing;
            
            window.eggWeightTracking.finishWeightEditing = function(cell, input, displaySpan) {
                // If the input is empty, handle it as a weight removal
                if (!input.value || input.value.trim() === '') {
                    // Mark as empty
                    displaySpan.textContent = 'Click to add';
                    displaySpan.style.display = '';
                    cell.classList.add('unsaved-changes');
                    
                    // Remove the input
                    if (input.parentNode === cell) {
                        cell.removeChild(input);
                    }
                    
                    return true;
                }
                
                // Otherwise use the original function
                return originalFinishEditing.call(this, cell, input, displaySpan);
            };
        }
    }
    
    // Collect all user-entered weights from the table
    function collectUserEnteredWeights(originalWeights) {
        // Create a deep copy of the weights array
        const updatedWeights = JSON.parse(JSON.stringify(originalWeights));
        
        // Get all weight cells
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody) return updatedWeights;
        
        // Check each cell in the table
        const cells = tableBody.querySelectorAll('.editable-weight');
        cells.forEach(cell => {
            const day = parseInt(cell.dataset.day);
            if (isNaN(day) || day < 0 || day >= updatedWeights.length) return;
            
            const displaySpan = cell.querySelector('.weight-display');
            if (!displaySpan) return;
            
            const displayText = displaySpan.textContent.trim();
            
            // Handle different display values
            if (displayText === 'Click to add') {
                // This is an empty cell - set weight to null
                updatedWeights[day].weight = null;
                updatedWeights[day].interpolated = false;
            } else if (!isNaN(parseFloat(displayText))) {
                // This is a number - update the weight if it's displayed as non-interpolated
                if (!displaySpan.classList.contains(INTERPOLATED_WEIGHT_CLASS)) {
                    updatedWeights[day].weight = parseFloat(displayText);
                    updatedWeights[day].interpolated = false;
                }
            }
        });
        
        return updatedWeights;
    }
    
    // Main interpolation function
    async function runInterpolation() {
        // Get the current egg data
        if (!window.currentEggId || !window.eggs) return;
        
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) return;
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Reset interpolated weights first
        updatedWeights.forEach(day => {
            if (day.interpolated) {
                day.weight = null;
                day.interpolated = false;
            }
        });
        
        // Find days with known weights (user-entered only)
        const knownWeightDays = updatedWeights
            .filter(day => day.weight !== null && !day.interpolated)
            .map(day => ({
                day: day.day,
                weight: parseFloat(day.weight)
            }));
        
        // Sort by day
        knownWeightDays.sort((a, b) => a.day - b.day);
        
        // If we don't have any known weights, just save the update
        if (knownWeightDays.length === 0) {
            try {
                await window.eggsCollection.doc(currentEgg.id).update({
                    dailyWeights: updatedWeights
                });
                
                // Update local data
                currentEgg.dailyWeights = updatedWeights;
                
                // Update the global eggs array
                const eggIndex = window.eggs.findIndex(e => e.id === currentEgg.id);
                if (eggIndex !== -1) {
                    window.eggs[eggIndex].dailyWeights = updatedWeights;
                }
                
                // Apply styling
                applyInterpolationStyling(currentEgg);
            } catch (error) {
                window.showToast('Error updating weights');
            }
            return;
        }
        
        // Calculate interpolation
        const totalDays = updatedWeights.length - 1;
        
        // Interpolate between known points
        for (let i = 0; i < knownWeightDays.length - 1; i++) {
            const startPoint = knownWeightDays[i];
            const endPoint = knownWeightDays[i + 1];
            
            // Calculate daily loss rate
            const weightDiff = endPoint.weight - startPoint.weight;
            const daysDiff = endPoint.day - startPoint.day;
            const dailyRate = daysDiff > 0 ? weightDiff / daysDiff : 0;
            
            // Fill in days between
            for (let day = startPoint.day + 1; day < endPoint.day; day++) {
                const daysFromStart = day - startPoint.day;
                const interpolatedWeight = startPoint.weight + (dailyRate * daysFromStart);
                
                updatedWeights[day].weight = parseFloat(interpolatedWeight.toFixed(2));
                updatedWeights[day].interpolated = true;
            }
        }
        
        // Project for days after the last known point
        if (knownWeightDays.length > 0) {
            const firstPoint = knownWeightDays[0];
            const lastPoint = knownWeightDays[knownWeightDays.length - 1];
            
            if (lastPoint.day > 0) { // Not just the initial point
                // Calculate average daily loss
                const totalLoss = firstPoint.weight - lastPoint.weight;
                const avgDailyLoss = lastPoint.day > 0 ? totalLoss / lastPoint.day : 0;
                
                // Project for remaining days
                for (let day = lastPoint.day + 1; day <= totalDays; day++) {
                    const daysAfterLast = day - lastPoint.day;
                    const projectedWeight = lastPoint.weight - (avgDailyLoss * daysAfterLast);
                    
                    updatedWeights[day].weight = parseFloat(Math.max(0, projectedWeight).toFixed(2));
                    updatedWeights[day].interpolated = true;
                }
            }
        }
        
        // Save the updated weights
        try {
            await window.eggsCollection.doc(currentEgg.id).update({
                dailyWeights: updatedWeights
            });
            
            // Update local data
            currentEgg.dailyWeights = updatedWeights;
            
            // Update the global eggs array
            const eggIndex = window.eggs.findIndex(e => e.id === currentEgg.id);
            if (eggIndex !== -1) {
                window.eggs[eggIndex].dailyWeights = updatedWeights;
            }
            
            // Apply styling
            applyInterpolationStyling(currentEgg);
            
            window.showToast('Weights updated with interpolation');
        } catch (error) {
            window.showToast('Error updating weights');
        }
    }
    
    // Apply styling to interpolated weights
    function applyInterpolationStyling(egg) {
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody || !egg.dailyWeights) return;
        
        egg.dailyWeights.forEach(dayData => {
            // Find the cell for this day
            const cell = tableBody.querySelector(`.editable-weight[data-day="${dayData.day}"]`);
            if (!cell) return;
            
            const displaySpan = cell.querySelector('.weight-display');
            if (!displaySpan) return;
            
            // Handle weight display
            if (dayData.weight !== null) {
                // Update the text
                displaySpan.textContent = dayData.weight;
                
                // Apply or remove interpolation styling
                if (dayData.interpolated) {
                    displaySpan.classList.add(INTERPOLATED_WEIGHT_CLASS);
                } else {
                    displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS);
                }
                
                // Handle deviation styling
                displaySpan.classList.remove('weight-deviation-high', 'weight-deviation-low');
                
                const deviation = dayData.weight - dayData.targetWeight;
                if (Math.abs(deviation) > (dayData.targetWeight * 0.05)) {
                    const deviationClass = deviation > 0 ? 'weight-deviation-high' : 'weight-deviation-low';
                    displaySpan.classList.add(deviationClass);
                }
            } else {
                displaySpan.textContent = 'Click to add';
                displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
            }
        });
    }
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        runInterpolation,
        applyInterpolationStyling,
        collectUserEnteredWeights
    };
});
