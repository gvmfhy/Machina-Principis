// Machina Principis - Electron Preload Script
// Securely exposes APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Expose the game API to the renderer process
contextBridge.exposeInMainWorld('MachinaPrincipis', {
  // Game initialization
  initialize: (config) => ipcRenderer.invoke('initialize-game', config),
  start: () => ipcRenderer.invoke('start-game'),
  
  // Game state queries
  getGameState: () => ipcRenderer.invoke('get-game-state'),
  getMapData: (civId) => ipcRenderer.invoke('get-map-data', civId),
  getCivilizationData: (civId) => ipcRenderer.invoke('get-civilization-data', civId),
  
  // Game control
  pauseGame: () => ipcRenderer.invoke('pause-game'),
  resumeGame: () => ipcRenderer.invoke('resume-game'),
  setTurnSpeed: (speed) => ipcRenderer.invoke('set-turn-speed', speed),
  
  // Data access
  exportData: () => ipcRenderer.invoke('export-data'),
  getMachiavellianMetrics: () => ipcRenderer.invoke('get-machiavellian-metrics'),
  getPublicCommunications: (count) => ipcRenderer.invoke('get-public-communications', count),
  getHistoricalEvents: (count) => ipcRenderer.invoke('get-historical-events', count),
  
  // Event subscription
  on: (channel, callback) => {
    // Validate channel names to prevent arbitrary IPC exposure
    const validChannels = [
      'game:onTurnStart',
      'game:onTurnEnd',
      'game:onGameStart',
      'game:onGameEnd',
      'game:onBattleOccurred',
      'game:onSettlementFounded',
      'game:onTechnologyDiscovered',
      'game:onDiplomacyChanged',
      'game:onAgentDecision'
    ];
    
    if (validChannels.includes(channel)) {
      // Add event listener
      const subscription = (event, data) => callback(data);
      ipcRenderer.on(channel, subscription);
      
      // Return a cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  }
});

// Expose general utilities
contextBridge.exposeInMainWorld('ElectronUtils', {
  // Platform info
  platform: process.platform,
  
  // Local storage proxy (for settings)
  settings: {
    get: (key) => {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch (e) {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Failed to save setting:', e);
        return false;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// Log when preload script has completed
console.log('Preload script loaded successfully');