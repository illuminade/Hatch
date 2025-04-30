// eggWeightInterpolation.js - Direct implementation for weight interpolation with dustbin delete buttons
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
            padding: 6px 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .weight-delete-btn:hover {
            opacity: 1;
        }
        
        .delete-cell {
            width: 40px;
            text-align: center;
            padding: 0 !important;
        }
        
        .update-weights-container {
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
            margin: 15px 0;
        }
        
        .interpolate-weights-btn {
            margin-left: 10px;
            background-color: transparent;
            border: 1px solid #007AFF;
            color: #007AFF;
        }
        
        .interpolation-info {
            margin-bottom: 10px;
            font-size: 0.85rem;
            color: #777;
            font-style: italic;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Track the current egg data
    let currentEggData = null;
    
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
                
                // Modify the table to add delete buttons
                setTimeout(() => {
                    addDeleteButtons();
                    addInterpolateButton();
                    applyInterpolationStyling(egg);
                }, 100); // Increased timeout to ensure the table is fully rendered
            };
        }
    }
    
    // Handle egg details loaded event
    function handleEggDetailsLoaded(event) {
        // Store the current egg data locally
        currentEggData = event.detail.eggData;
        
        // Run interpolation automatically if we have enough data points
        setTimeout(async () => {
            if (currentEggData && currentEggData.dailyWeights) {
                // Check if we have at least 2 non-interpolated weight entries
                const knownWeightPoints = currentEggData.dailyWeights.filter(
                    day => day.weight !== null && !day.interpolated
                );
                
                if (knownWeightPoints.length >= 2) {
                    // If we have enough data points, run interpolation
                    await runInterpolation(currentEggData.id);
                }
                
                // Add UI elements
                addDeleteButtons();
                addInterpolateButton();
                applyInterpolationStyling(currentEggData);
            }
        }, 300); // Increased timeout to ensure all DOM elements are ready
    }
    
    // Add interpolate button to the UI
    function addInterpolateButton() {
        // Check if button already exists
        if (document.getElementById('interpolateWeightsBtn')) {
            return;
        }
        
        // Find or create the update weights button container
        let updateBtnContainer = document.querySelector('.update-weights-container');
        
        if (!updateBtnContainer) {
            // Container doesn't exist, create it
            updateBtnContainer = document.createElement('div');
            updateBtnContainer.className = 'update-weights-container';
            
            // Find the table to append after it
            const table = document.getElementById('dailyWeightTable');
            if (table && table.parentNode) {
                table.parentNode.insertBefore(updateBtnContainer, table.nextSibling);
            } else {
                // If table not found, try to add to the container that should have the table
                const container = document.querySelector('.table-container');
                if (container && container.parentNode) {
                    container.parentNode.insertBefore(updateBtnContainer, container.nextSibling);
                } else {
                    console.error('Could not find proper place to add button container');
                    return;
                }
            }
            
            // Create update weights button if it doesn't exist
            if (!document.getElementById('updateWeightsBtn')) {
                const updateBtn = document.createElement('button');
                updateBtn.id = 'updateWeightsBtn';
                updateBtn.className = 'btn btn-primary';
                updateBtn.innerHTML = '<i class="fas fa-save"></i> Update Weights';
                updateBtn.addEventListener('click', function() {
                    if (window.eggWeightTracking && window.eggWeightTracking.saveAllWeights) {
                        window.eggWeightTracking.saveAllWeights();
                    }
                });
                
                updateBtnContainer.appendChild(updateBtn);
            }
        }
        
        // Create interpolate button
        const interpolateBtn = document.createElement('button');
        interpolateBtn.id = 'interpolateWeightsBtn';
        interpolateBtn.className = 'btn interpolate-weights-btn';
        interpolateBtn.innerHTML = '<i class="fas fa-calculator"></i> Interpolate Missing';
        
        // Add event listener
        interpolateBtn.addEventListener('click', async function() {
            const eggId = window.currentEggId || (currentEggData ? currentEggData.id : null);
            if (eggId) {
                await runInterpolation(eggId);
                window.showToast('Interpolation complete');
            } else {
                window.showToast('Error: Cannot identify the current egg');
            }
        });
        
        // Add button to container
        updateBtnContainer.appendChild(interpolateBtn);
    }
    
    // Add delete buttons to the table
    function addDeleteButtons() {
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody) return;
        
        // First, check if the table header has the delete column
        const table = document.getElementById('dailyWeightTable');
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow && !headerRow.querySelector('th:last-child.delete-header')) {
                // Add a new header cell for the delete column
                const deleteHeader = document.createElement('th');
                deleteHeader.className = 'delete-header';
                deleteHeader.style.width = '40px';
                headerRow.appendChild(deleteHeader);
            }
        }
        
        // Process each row in the table
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            // Skip if this row already has a delete cell
            if (row.querySelector('.delete-cell')) return;
            
            // Get the day number from the cell with data-day attribute
            const dayCell = row.querySelector('.editable-weight');
            if (!dayCell) return;
            
            const day = parseInt(dayCell.dataset.day);
            if (isNaN(day)) return;
            
            // Skip day 0 (initial weight) which should not be removable
            if (day === 0) {
                // Add an empty cell for consistency
                const emptyCell = document.createElement('td');
                emptyCell.className = 'delete-cell';
                row.appendChild(emptyCell);
                return;
            }
            
            // Create a new cell for the delete button
            const deleteCell = document.createElement('td');
            deleteCell.className = 'delete-cell';
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'weight-delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Remove weight';
            deleteBtn.setAttribute('type', 'button');
            deleteBtn.dataset.day = day; // Store the day in the button for easy access
            
            // Add event listener for delete button
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Delete the weight
                const dayToDelete = parseInt(this.dataset.day);
                if (!isNaN(dayToDelete)) {
                    // Use the stored egg ID
                    const eggId = window.currentEggId || (currentEggData ? currentEggData.id : null);
                    if (eggId) {
                        deleteWeight(dayToDelete, eggId);
                    } else {
                        window.showToast('Error: Cannot identify the current egg');
                    }
                }
            });
            
            // Add the button to the cell
            deleteCell.appendChild(deleteBtn);
            
            // Add the cell to the row
            row.appendChild(deleteCell);
        });
    }
    
    // Delete a weight for a specific day
    async function deleteWeight(day, eggId) {
        // Use the provided egg ID or try to get from global state
        const effectiveEggId = eggId || window.currentEggId;
        
        if (!effectiveEggId) {
            window.showToast('Error: No egg ID available');
            return;
        }
        
        // Find the egg data
        const eggData = window.eggs.find(egg => egg.id === effectiveEggId) || currentEggData;
        
        if (!eggData || !Array.isArray(eggData.dailyWeights) || day >= eggData.dailyWeights.length) {
            window.showToast('Error: Invalid egg data');
            return;
        }
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(eggData.dailyWeights));
        
        // Set weight to null for this day and remove interpolation flag
        updatedWeights[day].weight = null;
        updatedWeights[day].interpolated = false;
        
        try {
            // Update in Firebase
            await window.eggsCollection.doc(effectiveEggId).update({
                dailyWeights: updatedWeights
            });
            
            // Update the egg data
            if (currentEggData && currentEggData.id === effectiveEggId) {
                currentEggData.dailyWeights = updatedWeights;
            }
            
            // Update the global eggs array
            const eggIndex = window.eggs.findIndex(e => e.id === effectiveEggId);
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
            await runInterpolation(effectiveEggId);
            
        } catch (error) {
            window.showToast('Error removing weight');
            console.error('Error removing weight:', error);
        }
    }
    
    // Apply styling to interpolated weights
    function applyInterpolationStyling(egg) {
        const tableBody = document.getElementById('dailyWeightTableBody');
        if (!tableBody || !egg || !egg.dailyWeights) return;
        
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
    async function runInterpolation(eggId) {
        // Use provided egg ID or try to get from global state
        const effectiveEggId = eggId || window.currentEggId;
        
        if (!effectiveEggId) {
            window.showToast('Error: No egg ID available for interpolation');
            return;
        }
        
        // Find the egg data
        const eggData = window.eggs.find(egg => egg.id === effectiveEggId) || currentEggData;
        
        if (!eggData || !Array.isArray(eggData.dailyWeights)) {
            window.showToast('Error: Invalid egg data for interpolation');
            return;
        }
        
        // Make a copy of the dailyWeights array
        const updatedWeights = JSON.parse(JSON.stringify(eggData.dailyWeights));
        
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
            window.showToast('Need at least 2 weight entries for interpolation');
            try {
                await window.eggsCollection.doc(effectiveEggId).update({
                    dailyWeights: updatedWeights
                });
                
                // Update the egg data
                if (currentEggData && currentEggData.id === effectiveEggId) {
                    currentEggData.dailyWeights = updatedWeights;
                }
                
                // Update the global eggs array
                const eggIndex = window.eggs.findIndex(e => e.id === effectiveEggId);
                if (eggIndex !== -1) {
                    window.eggs[eggIndex].dailyWeights = updatedWeights;
                }
                
                // Apply styling
                applyInterpolationStyling(eggData);
            } catch (error) {
                window.showToast('Error updating weights');
                console.error('Error updating weights:', error);
            }
            return;
        }
        
        // Calculate interpolation
        const totalDays = updatedWeights.length - 1;
        let interpolatedCount = 0;
        
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
                interpolatedCount++;
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
                    interpolatedCount++;
                }
            }
        }
        
        // Save the updated weights
        try {
            await window.eggsCollection.doc(effectiveEggId).update({
                dailyWeights: updatedWeights
            });
            
            // Update the egg data
            if (currentEggData && currentEggData.id === effectiveEggId) {
                currentEggData.dailyWeights = updatedWeights;
            }
            
            // Update the global eggs array
            const eggIndex = window.eggs.findIndex(e => e.id === effectiveEggId);
            if (eggIndex !== -1) {
                window.eggs[eggIndex].dailyWeights = updatedWeights;
            }
            
            // Apply styling
            applyInterpolationStyling(eggData);
            
            window.showToast(`Interpolated ${interpolatedCount} weights`);
        } catch (error) {
            window.showToast('Error updating weights');
            console.error('Error updating weights:', error);
        }
    }
    
    // Make functions available globally
    window.eggWeightInterpolation = {
        runInterpolation,
        applyInterpolationStyling,
        deleteWeight,
        addDeleteButtons,
        addInterpolateButton
    };
});
