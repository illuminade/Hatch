// eggWeightInterpolation.js - Direct implementation for weight interpolation with delete buttons
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const INTERPOLATED_WEIGHT_CLASS = 'interpolated-weight';
    
    // Add styles for interpolated weights and delete buttons
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
        
        .weight-delete-btn {
            background: none;
            border: none;
            color: #FF3B30;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
            padding: 5px;
            margin-left: 5px;
        }
        
        .weight-delete-btn:hover {
            opacity: 1;
        }
        
        .editable-weight {
            display: flex;
            align-items: center;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Initialize functionality
    setTimeout(initializeInterpolation, 500);
    
    // Initialize the interpolation functionality with delete buttons
    function initializeInterpolation() {
        // Listen for egg details loaded event to add delete buttons and styling
        document.addEventListener('eggDetailsLoaded', handleEggDetailsLoaded);
        
        // Override the weight update function if available
        if (window.eggWeightTracking && window.eggWeightTracking.saveAllWeights) {
            const originalSaveWeights = window.eggWeightTracking.saveAllWeights;
            
            window.eggWeightTracking.saveAllWeights = async function() {
                // Call the original function first
                await originalSaveWeights.call(this);
                
                // Then run interpolation
                await runInterpolation();
            };
        }
        
        // Override the table rendering if available
        if (window.eggWeightTracking && window.eggWeightTracking.renderDailyWeightsTable) {
            const originalRenderTable = window.eggWeightTracking.renderDailyWeightsTable;
            
            window.eggWeightTracking.renderDailyWeightsTable = function(egg) {
                // Call the original render function
                originalRenderTable.call(this, egg);
                
                // Add delete buttons to the table
                setTimeout(() => {
                    addDeleteButtons();
                    applyInterpolationStyling(egg);
                }, 50);
            };
        }
    }
    
    // Handle egg details loaded event
    function handleEggDetailsLoaded(event) {
        setTimeout(() => {
            const egg = event.detail.eggData;
            if (egg && egg.dailyWeights) {
                addDeleteButtons();
                applyInterpolationStyling(egg);
            }
        }, 100);
    }
    
    // Add delete buttons to the table
    function addDeleteButtons() {
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody) return;
        
        // Process each row in the table
        const cells = tableBody.querySelectorAll('.editable-weight');
        cells.forEach(cell => {
            // Skip if this cell already has a delete button
            if (cell.querySelector('.weight-delete-btn')) return;
            
            // Skip day 0 (initial weight) which should not be removable
            if (cell.dataset.day === '0') return;
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'weight-delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.title = 'Remove weight';
            deleteBtn.setAttribute('type', 'button');
            
            // Add event listener for delete button
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get the day number from the cell
                const day = parseInt(cell.dataset.day);
                if (isNaN(day)) return;
                
                // Delete the weight
                deleteWeight(day);
            });
            
            // Add the button to the cell
            cell.appendChild(deleteBtn);
        });
    }
    
    // Delete a weight for a specific day
    async function deleteWeight(day) {
        // Verify we have current egg data
        if (!window.currentEggId || !window.eggs) return;
        
        const currentEgg = window.eggs.find(egg => egg.id === window.currentEggId);
        if (!currentEgg || !Array.isArray(currentEgg.dailyWeights) || day >= currentEgg.dailyWeights.length) return;
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(currentEgg.dailyWeights));
        
        // Set weight to null for this day and remove interpolation flag
        updatedWeights[day].weight = null;
        updatedWeights[day].interpolated = false;
        
        try {
            // Update in Firebase
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
            
            // Update the display
            const tableBody = document.getElementById('dailyWeightTableBody');
            if (tableBody) {
                const cell = tableBody.querySelector(`.editable-weight[data-day="${day}"]`);
                if (cell) {
                    const displaySpan = cell.querySelector('.weight-display');
                    if (displaySpan) {
                        displaySpan.textContent = 'Click to add';
                        displaySpan.classList.remove(INTERPOLATED_WEIGHT_CLASS, 'weight-deviation-high', 'weight-deviation-low');
                    }
                }
            }
            
            window.showToast('Weight removed');
            
            // Run interpolation
            await runInterpolation();
            
        } catch (error) {
            window.showToast('Error removing weight: ' + (error.message || 'Unknown error'));
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
        
        // If we don't have enough points for interpolation, just save and return
        if (knownWeightDays.length < 2) {
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
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        runInterpolation,
        applyInterpolationStyling,
        deleteWeight,
        addDeleteButtons
    };
});
