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
        
        // Also override the finishWeightEditing function to handle weight removal
        // Find the original function in the document
        const originalScript = Array.from(document.scripts)
            .find(script => script.textContent.includes('function finishWeightEditing'));
        
        if (originalScript) {
            // The function might be in eggWeightTracking.js
            // We'll add our own event listener to capture the completion of editing
            document.addEventListener('weightEditingFinished', function(e) {
                const { cell, isEmpty } = e.detail;
                if (isEmpty) {
                    // If a weight was removed, we need to update the cell style
                    const displaySpan = cell.querySelector('.weight-display');
                    if (displaySpan) {
                        displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
                    }
                }
            });
        }
        
        // Add styles for interpolated weights
        addInterpolationStyles();
        
        // Override the render function
        overrideRenderFunction();
        
        // Monkey patch the existing makeWeightCellEditable function to handle weight removal
        patchWeightCellEditable();
    }
    
    // Patch the weight cell editable function to support weight removal
    function patchWeightCellEditable() {
        if (window.eggWeightTracking) {
            // Get all functions from the document
            const allFunctions = {};
            Array.from(document.scripts).forEach(script => {
                // Extract all function declarations from script content
                const functionMatches = script.textContent.match(/function\s+(\w+)\s*\(/g);
                if (functionMatches) {
                    functionMatches.forEach(match => {
                        const funcName = match.replace('function', '').replace('(', '').trim();
                        allFunctions[funcName] = true;
                    });
                }
            });
            
            // If the finishWeightEditing function exists, we'll try to enhance it
            if (allFunctions.finishWeightEditing) {
                // We'll add a custom version of finishWeightEditing 
                window.customFinishWeightEditing = function(cell, input, displaySpan) {
                    let isEmpty = false;
                    
                    // Check if the input has a value
                    if (input.value) {
                        // Format value to 2 decimal places
                        const formattedValue = parseFloat(input.value).toFixed(2);
                        displaySpan.textContent = formattedValue;
                        
                        // Mark cell as having unsaved changes
                        cell.classList.add('unsaved-changes');
                    } else {
                        // If no value, restore original text and mark as empty
                        displaySpan.textContent = 'Click to add';
                        isEmpty = true;
                        
                        // Mark this cell to have weight removed during save
                        cell.dataset.removeWeight = "true";
                    }
                    
                    // Show display span and remove input
                    displaySpan.style.display = '';
                    
                    // Sometimes the input might already be removed, so check first
                    if (input.parentNode === cell) {
                        cell.removeChild(input);
                    }
                    
                    // Dispatch a custom event that we can listen for
                    const event = new CustomEvent('weightEditingFinished', { 
                        detail: { cell, isEmpty } 
                    });
                    document.dispatchEvent(event);
                    
                    return isEmpty;
                };
            }
        }
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
        
        // Handle any weight removals first
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (tableBody) {
            const cellsToRemoveWeight = tableBody.querySelectorAll('.editable-weight[data-remove-weight="true"]');
            cellsToRemoveWeight.forEach(cell => {
                const day = parseInt(cell.dataset.day);
                // Find this day in the updatedWeights array and set weight to null
                if (day >= 0 && day < updatedWeights.length) {
                    updatedWeights[day].weight = null;
                    updatedWeights[day].interpolated = false;
                }
                // Clear the removal flag
                cell.removeAttribute('data-remove-weight');
            });
        }
        
        // Find days with known weights (user-entered) - exclude interpolated weights and null weights
        const knownWeightDays = updatedWeights
            .filter(day => day.weight !== null && !day.interpolated)
            .map(day => ({
                day: day.day,
                weight: parseFloat(day.weight)
            }));
        
        // Make sure we have at least one known weight
        if (knownWeightDays.length === 0) {
            // Update the database to save any weight removals
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
                if (window.eggWeightTracking && window.eggWeightTracking.renderDailyWeightsTable) {
                    window.eggWeightTracking.renderDailyWeightsTable(currentEgg);
                }
            } catch (error) {
                window.showToast('Error updating weights: ' + (error.message || 'Unknown error'));
            }
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
    
    // Add event listener to handle entering empty values
    function addEmptyValueHandler() {
        document.addEventListener('click', function(e) {
            // Only handle clicks on weight cells
            if (!e.target.closest('.editable-weight')) {
                return;
            }
            
            // Find the cell
            const cell = e.target.closest('.editable-weight');
            
            // Add a keyup event handler to the input
            const handleInputCreation = function() {
                const input = cell.querySelector('input');
                if (input) {
                    // Handle the backspace and delete keys
                    input.addEventListener('keyup', function(e) {
                        if (input.value === '' && (e.key === 'Delete' || e.key === 'Backspace')) {
                            // Mark this input as empty for processing
                            input.dataset.empty = "true";
                        }
                    });
                    
                    // Handle the Enter key to process the empty value
                    input.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter' && input.value === '') {
                            e.preventDefault();
                            const displaySpan = cell.querySelector('.weight-display');
                            if (displaySpan) {
                                // Use our custom function if available, otherwise just update the text
                                if (window.customFinishWeightEditing) {
                                    window.customFinishWeightEditing(cell, input, displaySpan);
                                } else {
                                    displaySpan.textContent = 'Click to add';
                                    displaySpan.style.display = '';
                                    cell.removeChild(input);
                                }
                            }
                        }
                    });
                    
                    // Clean up this handler as it's no longer needed
                    document.removeEventListener('DOMNodeInserted', handleInputCreation);
                }
            };
            
            // Watch for the input element to be added
            document.addEventListener('DOMNodeInserted', handleInputCreation);
        });
    }
    
    // Listen for egg details loaded event
    document.addEventListener('eggDetailsLoaded', handleEggDetailsLoaded);
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        interpolateUnknownWeights,
        renderInterpolatedWeights
    };
    
    // Start initialization
    setTimeout(function() {
        initializeWeightInterpolation();
        addEmptyValueHandler();
    }, 300);
});
