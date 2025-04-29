// eggWeightInterpolation.js - Direct implementation for weight interpolation
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
    
    // Direct modification of the original weight tracking code
    // We'll check every 300ms for the weight tracking module
    let attemptCount = 0;
    const initInterval = setInterval(function() {
        attemptCount++;
        
        // Give up after 20 attempts (6 seconds)
        if (attemptCount > 20) {
            clearInterval(initInterval);
            console.error("Could not initialize egg weight interpolation");
            return;
        }
        
        // Check if the needed functions are available
        if (window.eggWeightTracking && window.eggWeightTracking.saveAllWeights) {
            clearInterval(initInterval);
            
            // Override the weight update function
            const originalSaveWeights = window.eggWeightTracking.saveAllWeights;
            window.eggWeightTracking.saveAllWeights = async function() {
                // First save the user-entered weights
                await originalSaveWeights.call(this);
                
                // Then perform interpolation
                try {
                    await runInterpolation();
                } catch (error) {
                    window.showToast('Error during interpolation');
                }
            };
            
            // Override the finishWeightEditing function to handle empty values
            if (window.eggWeightTracking.finishWeightEditing) {
                const originalFinishEditing = window.eggWeightTracking.finishWeightEditing;
                window.eggWeightTracking.finishWeightEditing = function(cell, input, displaySpan) {
                    // If the input is empty, mark it for removal
                    if (!input.value || input.value.trim() === '') {
                        // Display "Click to add" text
                        displaySpan.textContent = 'Click to add';
                        displaySpan.style.display = '';
                        
                        // Remove styles
                        displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
                        
                        // Mark for removal
                        const day = parseInt(cell.dataset.day);
                        if (!isNaN(day) && window.currentEggId) {
                            setTimeout(function() {
                                removeWeight(day);
                            }, 100);
                        }
                        
                        // Remove the input
                        if (input.parentNode) {
                            input.parentNode.removeChild(input);
                        }
                        
                        return true;
                    }
                    
                    // Otherwise use the original function
                    return originalFinishEditing.call(this, cell, input, displaySpan);
                };
            }
            
            // Also listen for egg details loaded event to apply interpolation styling
            document.addEventListener('eggDetailsLoaded', function(event) {
                setTimeout(function() {
                    const egg = event.detail.eggData;
                    if (egg && egg.dailyWeights) {
                        applyInterpolationStyling(egg);
                    }
                }, 100);
            });
        }
    }, 300);
    
    // Function to remove a weight from a specific day
    async function removeWeight(day) {
        // Get the current egg data
        if (!window.currentEggId || !window.eggs) return;
        
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) return;
        
        // Check if this day exists
        if (day < 0 || day >= currentEgg.dailyWeights.length) return;
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Set weight to null for this day and remove interpolation flag
        updatedWeights[day].weight = null;
        updatedWeights[day].interpolated = false;
        
        // Update the database
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
            
            // Run interpolation
            await runInterpolation();
        } catch (error) {
            window.showToast('Error removing weight');
        }
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
                const avgDailyLoss = totalLoss / lastPoint.day;
                
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
        runInterpolation: runInterpolation,
        applyInterpolationStyling: applyInterpolationStyling,
        removeWeight: removeWeight
    };
    
    // Add direct event listeners for weight removal
    setTimeout(function() {
        // This adds functionality for removing weights by pressing delete or backspace
        document.addEventListener('keydown', function(e) {
            if ((e.key === 'Delete' || e.key === 'Backspace') && 
                document.activeElement.tagName === 'INPUT' && 
                document.activeElement.closest('.editable-weight')) {
                
                // Mark as emptied if the user clears the field
                const input = document.activeElement;
                if (input.value === '') {
                    input.dataset.emptied = 'true';
                }
            }
        });
        
        // Handle enter key on empty inputs
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && 
                document.activeElement.tagName === 'INPUT' && 
                document.activeElement.closest('.editable-weight') &&
                document.activeElement.value === '') {
                
                e.preventDefault();
                
                const input = document.activeElement;
                const cell = input.closest('.editable-weight');
                const displaySpan = cell.querySelector('.weight-display');
                
                if (displaySpan) {
                    // Update the display
                    displaySpan.textContent = 'Click to add';
                    displaySpan.style.display = '';
                    displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
                    
                    // Remove the input
                    if (input.parentNode) {
                        input.parentNode.removeChild(input);
                    }
                    
                    // Remove the weight from the database
                    const day = parseInt(cell.dataset.day);
                    if (!isNaN(day)) {
                        window.eggWeightInterpolation.removeWeight(day);
                    }
                }
            }
        });
    }, 1000);
});
