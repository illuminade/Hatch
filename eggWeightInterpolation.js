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
        
        /* Add a class to mark cells for weight removal */
        .weight-to-remove {
            position: relative;
        }
        
        .weight-to-remove .weight-display {
            text-decoration: line-through;
            opacity: 0.7;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Keep track of weights to be removed
    const weightsToRemove = new Set();
    
    // Direct modification of the original weight tracking code
    // We'll check every 300ms for the weight tracking module
    let attemptCount = 0;
    const initInterval = setInterval(function() {
        attemptCount++;
        
        // Give up after 20 attempts (6 seconds)
        if (attemptCount > 20) {
            clearInterval(initInterval);
            return;
        }
        
        // Check if the needed functions are available
        if (window.eggWeightTracking && window.eggWeightTracking.saveAllWeights) {
            clearInterval(initInterval);
            
            // Override the weight update function
            const originalSaveWeights = window.eggWeightTracking.saveAllWeights;
            window.eggWeightTracking.saveAllWeights = async function() {
                // First process any weights that need to be removed
                if (weightsToRemove.size > 0) {
                    await processWeightRemovals();
                }
                
                // Then save the user-entered weights
                await originalSaveWeights.call(this);
                
                // Then perform interpolation
                try {
                    await runInterpolation();
                } catch (error) {
                    window.showToast('Error during interpolation');
                }
            };
            
            // Add custom cell editing function for weight removal
            window.eggWeightTracking.makeWeightCellEditableWithRemoval = function(event) {
                const cell = event.currentTarget;
                const displaySpan = cell.querySelector('.weight-display');
                
                // Don't do anything if we're already editing this cell
                if (cell.querySelector('input')) {
                    return;
                }
                
                // Stop event propagation to prevent other handlers
                event.stopPropagation();
                
                const day = parseInt(cell.dataset.day);
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
                
                // Add a delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'weight-delete-btn';
                deleteBtn.style.cssText = 'position: absolute; right: -30px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #FF3B30; cursor: pointer; font-size: 1rem;';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Clear weight';
                
                // Replace span with input
                displaySpan.style.display = 'none';
                cell.appendChild(input);
                cell.appendChild(deleteBtn);
                
                // Focus the input
                input.focus();
                
                // Add event listeners for input
                input.addEventListener('keypress', function(e) {
                    // Submit on Enter key
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishWeightEditingWithRemoval(cell, input, displaySpan, false);
                    }
                });
                
                // Delete button to clear weight
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Clear the input and mark for removal
                    input.value = '';
                    finishWeightEditingWithRemoval(cell, input, displaySpan, true);
                });
                
                // Prevent input events from bubbling up
                input.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            };
            
            // Override the original cell click handler
            const dailyWeightTableBody = document.getElementById('dailyWeightTableBody');
            if (dailyWeightTableBody) {
                // Remove any existing click listeners (may not work for all cases)
                const newTableBody = dailyWeightTableBody.cloneNode(true);
                dailyWeightTableBody.parentNode.replaceChild(newTableBody, dailyWeightTableBody);
                
                // Add our custom event listener
                newTableBody.addEventListener('click', function(event) {
                    const cell = event.target.closest('.editable-weight');
                    if (cell) {
                        window.eggWeightTracking.makeWeightCellEditableWithRemoval(event);
                    }
                });
            }
            
            // Also listen for egg details loaded event to apply interpolation styling
            document.addEventListener('eggDetailsLoaded', function(event) {
                setTimeout(function() {
                    const egg = event.detail.eggData;
                    if (egg && egg.dailyWeights) {
                        applyInterpolationStyling(egg);
                        
                        // Set up the edit handlers for the new cells
                        const tableBody = document.getElementById('dailyWeightTableBody');
                        if (tableBody) {
                            // Get all editable cells
                            const cells = tableBody.querySelectorAll('.editable-weight');
                            cells.forEach(cell => {
                                // Remove existing event listeners
                                const newCell = cell.cloneNode(true);
                                cell.parentNode.replaceChild(newCell, cell);
                                
                                // Add our custom event listener
                                newCell.addEventListener('click', function(event) {
                                    window.eggWeightTracking.makeWeightCellEditableWithRemoval(event);
                                });
                            });
                        }
                    }
                }, 100);
            });
        }
    }, 300);
    
    // Custom function to finish weight editing with removal support
    function finishWeightEditingWithRemoval(cell, input, displaySpan, isRemoval) {
        const day = parseInt(cell.dataset.day);
        
        // If removing weight or input is empty
        if (isRemoval || !input.value) {
            // Mark this day for weight removal
            weightsToRemove.add(day);
            
            // Update display to show it's marked for removal
            displaySpan.textContent = 'To be removed';
            displaySpan.style.display = '';
            cell.classList.add('weight-to-remove');
            
            // Clean up the input and delete button
            removeInputControls(cell);
            
            return true;
        }
        
        // Otherwise, normal weight entry
        const formattedValue = parseFloat(input.value).toFixed(2);
        displaySpan.textContent = formattedValue;
        displaySpan.style.display = '';
        cell.classList.add('unsaved-changes');
        
        // Remove from weights to remove set if it was there
        weightsToRemove.delete(day);
        cell.classList.remove('weight-to-remove');
        
        // Clean up the input and delete button
        removeInputControls(cell);
        
        return false;
    }
    
    // Helper to remove input controls
    function removeInputControls(cell) {
        // Remove input
        const input = cell.querySelector('input');
        if (input && input.parentNode) {
            input.parentNode.removeChild(input);
        }
        
        // Remove delete button
        const deleteBtn = cell.querySelector('.weight-delete-btn');
        if (deleteBtn && deleteBtn.parentNode) {
            deleteBtn.parentNode.removeChild(deleteBtn);
        }
    }
    
    // Process weight removals before saving
    async function processWeightRemovals() {
        if (weightsToRemove.size === 0) return;
        
        // Get the current egg data
        if (!window.currentEggId || !window.eggs) return;
        
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights)) return;
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Process each day marked for removal
        let anyChanges = false;
        weightsToRemove.forEach(day => {
            if (day >= 0 && day < updatedWeights.length) {
                updatedWeights[day].weight = null;
                updatedWeights[day].interpolated = false;
                anyChanges = true;
            }
        });
        
        // Update the database if changes were made
        if (anyChanges) {
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
                
                // Update the UI
                applyInterpolationStyling(currentEgg);
                
                // Show success message
                window.showToast('Weights removed successfully');
            } catch (error) {
                window.showToast('Error removing weights');
            }
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
            
            // Remove any "to be removed" styling
            if (!weightsToRemove.has(dayData.day)) {
                cell.classList.remove('weight-to-remove');
            }
            
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
        processWeightRemovals: processWeightRemovals
    };
});
