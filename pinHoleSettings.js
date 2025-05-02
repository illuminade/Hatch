// pinHoleSettings.js - Manages pin hole recommendation settings
document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin Hole Settings module initializing...");
    
    // Initialize Firebase collection for recommendation settings
    const settingsCollection = window.db.collection('recommendationSettings');
    const SETTINGS_DOC_ID = 'global'; // We'll use a single document for global settings
    
    // Default settings
    const DEFAULT_SETTINGS = {
        minDayForFirstPinHole: 7,
        daysBetweenPinHoles: 3
    };
    
    // Store settings globally
    window.pinHoleSettings = DEFAULT_SETTINGS;
    
    // Load settings from Firebase
    async function loadSettings() {
        try {
            console.log("Loading pin hole settings from Firebase...");
            const doc = await settingsCollection.doc(SETTINGS_DOC_ID).get();
            
            if (doc.exists) {
                window.pinHoleSettings = doc.data();
            } else {
                // If settings don't exist yet, create with defaults
                await settingsCollection.doc(SETTINGS_DOC_ID).set(DEFAULT_SETTINGS);
                window.pinHoleSettings = DEFAULT_SETTINGS;
            }
            
            console.log("Loaded pin hole settings:", window.pinHoleSettings);
            updateSettingsUI();
            
            return window.pinHoleSettings;
        } catch (error) {
            window.showToast('Error loading settings: ' + error.message);
            console.error('Error loading settings:', error);
            return DEFAULT_SETTINGS;
        }
    }
    
    // Update settings in the UI
    function updateSettingsUI() {
        // Find settings form elements
        const minDayInput = document.getElementById('minDayForFirstPinHole');
        const daysBetweenInput = document.getElementById('daysBetweenPinHoles');
        
        // Update values if elements exist
        if (minDayInput) minDayInput.value = window.pinHoleSettings.minDayForFirstPinHole;
        if (daysBetweenInput) daysBetweenInput.value = window.pinHoleSettings.daysBetweenPinHoles;
    }
    
    // Save settings to Firebase
    async function saveSettings(settings) {
        try {
            await settingsCollection.doc(SETTINGS_DOC_ID).set(settings);
            window.pinHoleSettings = settings;
            window.showToast('Settings saved successfully!');
            updateSettingsUI();
            
            // Dispatch event to notify other components
            const event = new CustomEvent('pinHoleSettingsUpdated', { 
                detail: { settings: settings } 
            });
            document.dispatchEvent(event);
            
            return true;
        } catch (error) {
            window.showToast('Error saving settings: ' + error.message);
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    // Setup form handler for settings
    function setupSettingsForm() {
        const form = document.getElementById('pinHoleSettingsForm');
        if (!form) return;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const settings = {
                minDayForFirstPinHole: parseInt(document.getElementById('minDayForFirstPinHole').value),
                daysBetweenPinHoles: parseInt(document.getElementById('daysBetweenPinHoles').value)
            };
            
            await saveSettings(settings);
        });
    }
    
    // Make functions available globally
    window.pinHoleSettingsModule = {
        loadSettings,
        saveSettings,
        updateSettingsUI
    };
    
    // Listen for custom events
    document.addEventListener('loadPinHoleSettings', loadSettings);
    
    // Initialize settings
    loadSettings();
    setupSettingsForm();
});
