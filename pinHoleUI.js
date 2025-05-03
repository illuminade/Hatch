// pinHoleUI.js - Handles the UI for pin hole recommendations
document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin Hole UI module initializing...");
    
    // Render pin hole recommendations in the egg details page
    function renderRecommendations(eggId) {
        // Get the egg data
        const egg = window.eggs.find(e => e.id === eggId);
        if (!egg) return;
        
        // Get pin hole types and settings
        const pinHoleTypes = window.pinHoleTypes || [];
        const settings = window.pinHoleSettings || { minDayForFirstPinHole: 7, daysBetweenPinHoles: 3 };
        
        // Calculate recommendations
        const result = window.pinHoleRecommendationModule.calculateRecommendations(egg, pinHoleTypes, settings);
        
        // Find or create the recommendations container
        let recommendationsCard = document.getElementById('pinHoleRecommendationsCard');
        
        if (!recommendationsCard) {
            // Create a new container if it doesn't exist
            recommendationsCard = document.createElement('div');
            recommendationsCard.id = 'pinHoleRecommendationsCard';
            recommendationsCard.className = 'detail-info-card';
            
            // Find a place to insert it (after weight tracking card)
            const weightTrackingCard = document.querySelector('.detail-info-card:has(#dailyWeightTable)');
            if (weightTrackingCard && weightTrackingCard.nextElementSibling) {
                weightTrackingCard.parentNode.insertBefore(recommendationsCard, weightTrackingCard.nextElementSibling);
            } else {
                // Fallback: append to the egg details view
                const eggDetailView = document.querySelector('.egg-detail-view');
                if (eggDetailView) {
                    // Insert before action buttons
                    const actionButtons = eggDetailView.querySelector('.action-buttons');
                    if (actionButtons) {
                        eggDetailView.insertBefore(recommendationsCard, actionButtons);
                    } else {
                        eggDetailView.appendChild(recommendationsCard);
                    }
                }
            }
        }
        
        // Generate the content
        let content = `
            <h3>Pin Hole Recommendations</h3>
        `;
        
        if (!result.success) {
            // Show message if recommendations couldn't be made
            content += `
                <div class="detail-notes">${result.message}</div>
            `;
        } else {
            // Show weight projections and recommendations
            content += `
                <div class="detail-row">
                    <div class="detail-label">Current Day</div>
                    <div class="detail-value">Day ${result.currentDay}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Projected End Weight</div>
                    <div class="detail-value">${parseFloat(result.projectedEndWeight).toFixed(2)} g</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Target End Weight</div>
                    <div class="detail-value">${parseFloat(result.targetEndWeight).toFixed(2)} g</div>
                </div>
            `;
            
            if (result.recommendations && result.recommendations.length > 0) {
                content += `<div class="pin-hole-recommendations">`;
                
                result.recommendations.forEach((rec, index) => {
                    content += `
                        <div class="pin-hole-recommendation">
                            <div class="recommendation-icon">
                                <i class="fas fa-thumbtack"></i>
                            </div>
                            <div class="recommendation-details">
                                <div class="recommendation-day">Day ${rec.day}</div>
                                <div class="recommendation-type">${rec.type.name}</div>
                                <div class="recommendation-effect">Effect: -${rec.effect} g</div>
                            </div>
                        </div>
                    `;
                });
                
                content += `</div>`;
            } else {
                content += `<div class="detail-notes">No pin holes recommended at this time.</div>`;
            }
        }
        
        // Update the card content
        recommendationsCard.innerHTML = content;
        
        // Add some custom styling
        const style = document.createElement('style');
        style.textContent = `
            .pin-hole-recommendations {
                margin-top: 15px;
            }
            .pin-hole-recommendation {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                padding: 10px;
                background-color: rgba(0,0,0,0.03);
                border-radius: 8px;
            }
            .recommendation-icon {
                width: 40px;
                height: 40px;
                background: var(--primary-color);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-size: 1.1rem;
                margin-right: 12px;
            }
            .recommendation-day {
                font-weight: 600;
                font-size: 1.1rem;
            }
            .recommendation-effect {
                color: var(--accent-color);
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Listen for egg details loaded event
    document.addEventListener('eggDetailsLoaded', function(event) {
        const eggId = event.detail.eggId;
        
        // Wait for pin hole types and settings to be loaded
        if (window.pinHoleTypes && window.pinHoleSettings) {
            renderRecommendations(eggId);
        } else {
            // Wait for both to be loaded
            Promise.all([
                new Promise(resolve => {
                    if (window.pinHoleTypes) {
                        resolve();
                    } else {
                        document.addEventListener('pinHoleTypesLoaded', () => resolve(), { once: true });
                    }
                }),
                new Promise(resolve => {
                    if (window.pinHoleSettings) {
                        resolve();
                    } else {
                        document.addEventListener('pinHoleSettingsUpdated', () => resolve(), { once: true });
                    }
                })
            ]).then(() => {
                renderRecommendations(eggId);
            });
        }
    });
    
    // Make functions available globally
    window.pinHoleUIModule = {
        renderRecommendations
    };
});
document.addEventListener('eggDetailsLoaded', function(event) {
    const eggId = event.detail.eggId;
    
    function attemptRender() {
        if (window.pinHoleRecommendationModule?.calculateRecommendations && 
            window.pinHoleTypes && 
            window.pinHoleSettings) {
            renderRecommendations(eggId);
        } else {
            // Retry after a short delay
            setTimeout(attemptRender, 100);
        }
    }
    
    attemptRender();
});
