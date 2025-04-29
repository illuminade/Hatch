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
    
    // Keep track of weights to be removed
    const weightsToRemove = new Set();
    
    // Initialization
    setTimeout(function() {
        // Check if the needed functions are available
        if (window.eggWeightTracking && window.eggWeightTracking.saveAllWeights) {
            // Get the original functions we need to modify
            const originalSaveWeights = window.eggWeightTracking.saveAllWeights;
            
            // Override the weight update function
            window.eggWeightTracking.saveAllWeights = async function() {
                try {
                    // Step 1: Process any pending weight removals first
                    if (weightsToRemove.size > 0) {
                        const removed = await removeWeights();
                        if (removed) {
                            // If weights were successfully removed, return - this will trigger a refresh
                            // and the user can click update again to calculate interpolation
                            return;
                        }
                    }
                    
                    // Step 2: Call the original save function
                    await originalSaveWeights.call(this);
                    
                    // Step 3: Perform interpolation
                    await runInterpolation();
                } catch (error) {
                    window.showToast('Error during weight update');
                }
            };
            
            // Patch for handling weight deletions
            // Add an event listener to capture the backspace and delete keys
            document.addEventListener('keydown', function(e) {
                // Only handle if it's an input in an editable weight cell
                if (!e.target.matches('.editable-weight input')) return;
                
                // Store the current value to detect deletion
                const input = e.target;
                input.dataset.prevValue = input.value;
            });
            
            document.addEventListener('keyup', function(e) {
                // Only handle if it's an input in an editable weight cell
                if (!e.target.matches('.editable-weight input')) return;
                
                const input = e.target;
                const prevValue = input.dataset.prevValue || '';
                
                // If the input is now empty and had a value before, mark for deletion
                if (input.value === '' && prevValue !== '') {
                    // Get the day from the parent cell
                    const cell = input.closest('.editable-weight');
                    if (cell) {
                        const day = parseInt(cell.dataset.day);
                        if (!isNaN(day)) {
                            // Add to pending removal
                            weightsToRemove.add(day);
                            
                            // Visual indication
                            input.style.color = '#ff3b30'; // Red color
                            input.style.fontStyle = 'italic';
                            input.placeholder = 'Press Enter to remove';
                        }
                    }
                } else if (input.value !== '' && weightsToRemove.has(parseInt(input.closest('.editable-weight').dataset.day))) {
                    // If the input now has a value and was marked for removal, unmark it
                    const cell = input.closest('.editable-weight');
                    if (cell) {
                        const day = parseInt(cell.dataset.day);
                        if (!isNaN(day)) {
                            weightsToRemove.delete(day);
                            
                            // Reset styling
                            input.style.color = '';
                            input.style.fontStyle = '';
                            input.placeholder = 'Enter weight';
                        }
                    }
                }
            });
            
            // Handle Enter key for empty inputs - remove the weight
            document.addEventListener('keypress', function(e) {
                if (e.key !== 'Enter') return;
                
                // Check if this is an editable cell input
                if (!e.target.matches('.editable-weight input')) return;
                
                const input = e.target;
                
                // If the input is empty, mark for deletion
                if (input.value === '') {
                    e.preventDefault(); // Prevent default Enter behavior
                    
                    const cell = input.closest('.editable-weight');
                    if (cell) {
                        const day = parseInt(cell.dataset.day);
                        if (!isNaN(day)) {
                            // Handle the empty value like the original code would
                            const displaySpan = cell.querySelector('.weight-display');
                            if (displaySpan) {
                                // Visually mark as "to be removed"
                                displaySpan.textContent = 'To be removed';
                                displaySpan.style.color = '#ff3b30';
                                displaySpan.style.fontStyle = 'italic';
                                displaySpan.style.display = '';
                                
                                // Remove the input
                                cell.removeChild(input);
                                
                                // Mark for removal in our tracker
                                weightsToRemove.add(day);
                            }
                        }
                    }
                }
            });
            
            // Listen for egg details loaded to apply proper styling
            document.addEventListener('eggDetailsLoaded', function(event) {
                setTimeout(function() {
                    const egg = event.detail.eggData;
                    if (egg && egg.dailyWeights) {
                        applyInterpolationStyling(egg);
                    }
                }, 100);
            });
        }
    }, 500);
    
    // Remove weights from database
    async function removeWeights() {
        if (weightsToRemove.size === 0) return false;
        
        // Get the current egg data
        if (!window.currentEggId || !window.eggs) return false;
        
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) return false;
        
        // Make a copy of the weights
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Process each weight to remove
        weightsToRemove.forEach(day => {
            if (day >= 0 && day < updatedWeights.length) {
                updatedWeights[day].weight = null;
                updatedWeights[day].interpolated = false;
            }
        });
        
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
            
            // Clear the weights to remove
            weightsToRemove.clear();
            
            // Re-render the table (using original render function)
            if (window.eggWeightTracking && window.eggWeightTracking.renderDailyWeightsTable) {
                window.eggWeightTracking.renderDailyWeightsTable(currentEgg);
                setTimeout(() => applyInterpolationStyling(currentEgg), 50);
            }
            
            window.showToast('Weights removed successfully');
            return true;
        } catch (error) {
            window.showToast('Error removing weights');
            return false;
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
            
            // Check if this weight is marked for removal
            if (weightsToRemove.has(dayData.day)) {
                displaySpan.textContent = 'To be removed';
                displaySpan.style.color = '#ff3b30';
                displaySpan.style.fontStyle = 'italic';
                return;
            }
            
            // Handle weight display
            if (dayData.weight !== null) {
                // Update the text
                displaySpan.textContent = dayData.weight;
                displaySpan.style.color = '';
                
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
                displaySpan.style.color = '';
                displaySpan.style.fontStyle = '';
                displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
            }
        });
    }
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        runInterpolation,
        applyInterpolationStyling,
        removeWeights
    };
});
