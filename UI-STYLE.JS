/* Machiavellian AI Civilization Framework - UI Styling */

/* Base Styles */
:root {
  --primary-color: #3f51b5;
  --primary-light: #757de8;
  --primary-dark: #002984;
  --secondary-color: #ff5722;
  --secondary-light: #ff8a50;
  --secondary-dark: #c41c00;
  --text-light: #f5f5f5;
  --text-dark: #212121;
  --background-light: #f9f9f9;
  --background-dark: #121212;
  --border-light: #e0e0e0;
  --border-dark: #333333;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
  --info-color: #2196f3;

  --transition-speed: 0.3s;
  --border-radius: 4px;
}

/* Base Layout */
body {
  font-family: 'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: var(--background-light);
  color: var(--text-dark);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

body.dark-theme {
  background-color: var(--background-dark);
  color: var(--text-light);
}

.simulation-container {
  display: flex;
  flex-direction: column;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
  height: calc(100vh - 40px);
}

.simulation-layout {
  display: flex;
  flex: 1;
  gap: 20px;
  min-height: 0; /* Fix for Firefox flexbox */
}

/* Map Styles */
.map-container {
  flex: 3;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background-color: white;
  overflow: hidden;
  position: relative;
  min-height: 500px;
}

body.dark-theme .map-container {
  background-color: #1e1e1e;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

#map-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Sidebar Styles */
.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  min-width: 300px;
  max-width: 400px;
}

.civ-panel, .thought-panel, .metrics-panel {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 15px;
  overflow: hidden;
}

body.dark-theme .civ-panel,
body.dark-theme .thought-panel,
body.dark-theme .metrics-panel {
  background-color: #1e1e1e;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.sidebar h2 {
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
  color: var(--primary-color);
  font-size: 1.2rem;
}

body.dark-theme .sidebar h2 {
  color: var(--primary-light);
  border-bottom-color: var(--border-dark);
}

.sidebar h3 {
  font-size: 1.1rem;
  margin-top: 5px;
  margin-bottom: 10px;
}

.sidebar h4 {
  font-size: 0.9rem;
  margin-top: 10px;
  margin-bottom: 5px;
}

.civ-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-group {
  flex: 1;
  min-width: 120px;
}

.stat-group ul {
  padding-left: 20px;
  margin: 5px 0;
}

.stat-group li {
  font-size: 0.9rem;
  margin-bottom: 3px;
}

.diplomatic-relations {
  margin-top: 15px;
}

.diplomatic-relations ul {
  padding-left: 20px;
  margin: 5px 0;
}

.diplomatic-relations li {
  margin-bottom: 5px;
}

.status-neutral {
  color: var(--text-dark);
}

.status-war {
  color: var(--danger-color);
  font-weight: bold;
}

.status-peace-treaty, .status-alliance, .status-defensive-alliance, .status-research-agreement {
  color: var(--success-color);
  font-weight: bold;
}

.status-unknown {
  color: var(--text-dark);
  font-style: italic;
  opacity: 0.7;
}

body.dark-theme .status-neutral {
  color: var(--text-light);
}

body.dark-theme .status-unknown {
  color: var(--text-light);
}

/* Thought Panel */
.thought-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  border-radius: var(--border-radius);
  background-color: var(--background-light);
  margin-bottom: 10px;
  font-size: 0.9rem;
  line-height: 1.4;
}

body.dark-theme .thought-content {
  background-color: #2a2a2a;
}

.thought-content p {
  margin-top: 0;
  margin-bottom: 10px;
}

.historical-thoughts {
  margin-top: 15px;
}

#historical-thoughts-select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius);
  background-color: white;
  font-size: 0.9rem;
}

body.dark-theme #historical-thoughts-select {
  background-color: #2a2a2a;
  color: var(--text-light);
  border-color: var(--border-dark);
}

.personality ul {
  padding-left: 20px;
  margin: 5px 0;
}

.personality li {
  margin-bottom: 3px;
  font-size: 0.9rem;
}

/* Metrics Panel */
.machiavellian-score {
  margin-bottom: 15px;
}

.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: var(--background-light);
  border-radius: var(--border-radius);
}

body.dark-theme .score-container {
  background-color: #2a2a2a;
}

.score-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color);
}

body.dark-theme .score-value {
  color: var(--primary-light);
}

.score-interpretation {
  margin-top: 5px;
  text-align: center;
  font-weight: 500;
}

.score-trend {
  margin-top: 5px;
  font-style: italic;
  font-size: 0.8rem;
  text-align: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric-card {
  padding: 10px;
  background-color: var(--background-light);
  border-radius: var(--border-radius);
  text-align: center;
}

body.dark-theme .metric-card {
  background-color: #2a2a2a;
}

.metric-card h4 {
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-detail {
  font-size: 0.8rem;
}

/* Control Panel */
.control-panel {
  display: flex;
  justify-content: space-between;
  background-color: white;
  padding: 15px;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  align-items: center;
}

body.dark-theme .control-panel {
  background-color: #1e1e1e;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.simulation-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.controls-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color var(--transition-speed);
}

.control-btn:hover {
  background-color: var(--primary-dark);
}

body.dark-theme .control-btn {
  background-color: var(--primary-dark);
}

body.dark-theme .control-btn:hover {
  background-color: var(--primary-color);
}

.control-select {
  padding: 8px;
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius);
  background-color: white;
  font-size: 0.9rem;
}

body.dark-theme .control-select {
  background-color: #2a2a2a;
  color: var(--text-light);
  border-color: var(--border-dark);
}

.turn-info {
  font-size: 1rem;
  font-weight: bold;
}

/* Modal */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: var(--border-radius);
  width: 80%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

body.dark-theme .modal-content {
  background-color: #1e1e1e;
}

.close-modal {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-content h2 {
  margin-top: 0;
  color: var(--primary-color);
}

body.dark-theme .modal-content h2 {
  color: var(--primary-light);
}

.final-results {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 20px 0;
}

.civ-result {
  flex: 1;
  min-width: 200px;
  padding: 15px;
  border-radius: var(--border-radius);
  border-left: 5px solid;
  background-color: var(--background-light);
}

body.dark-theme .civ-result {
  background-color: #2a2a2a;
}

.civ-result h4 {
  margin-top: 0;
  margin-bottom: 10px;
}

.civ-result p {
  margin: 5px 0;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.modal-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color var(--transition-speed);
}

.modal-btn:hover {
  background-color: var(--primary-dark);
}

body.dark-theme .modal-btn {
  background-color: var(--primary-dark);
}

body.dark-theme .modal-btn:hover {
  background-color: var(--primary-color);
}

/* Notifications */
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transform: translateX(120%);
  transition: transform var(--transition-speed);
  opacity: 0.9;
}

body.dark-theme .notification {
  background-color: #1e1e1e;
}

.notification.show {
  transform: translateX(0);
}

.notification-header {
  padding: 10px 15px;
  font-weight: bold;
  color: white;
}

.notification-body {
  padding: 10px 15px;
  font-size: 0.9rem;
}

.notification-info .notification-header {
  background-color: var(--info-color);
}

.notification-war .notification-header {
  background-color: var(--danger-color);
}

.notification-alliance .notification-header {
  background-color: var(--success-color);
}

.notification-betrayal .notification-header {
  background-color: var(--warning-color);
}

.error {
  color: var(--danger-color);
  font-style: italic;
}

/* Responsive Adjustments */
@media (max-width: 1200px) {
  .simulation-layout {
    flex-direction: column;
  }
  
  .sidebar {
    flex-direction: row;
    max-width: none;
    overflow-x: auto;
  }
  
  .civ-panel, .thought-panel, .metrics-panel {
    flex: 1;
    min-width: 300px;
    max-height: 300px;
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .sidebar {
    flex-direction: column;
    overflow-x: visible;
  }
  
  .control-panel {
    flex-direction: column;
    gap: 10px;
  }
  
  .simulation-controls {
    width: 100%;
    justify-content: center;
  }
  
  .turn-info {
    width: 100%;
    text-align: center;
  }
  
  .final-results {
    flex-direction: column;
  }
}
