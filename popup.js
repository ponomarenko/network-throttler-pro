/**
 * Popup UI Controller for Network Throttler Pro
 */

class PopupController {
  constructor() {
    this.settings = null;
    this.presets = {
      'slow-3g': { avgSpeed: 25, speedVariation: 15, latency: 300, latencyVariation: 100 },
      'fast-3g': { avgSpeed: 75, speedVariation: 25, latency: 150, latencyVariation: 75 },
      'slow-4g': { avgSpeed: 150, speedVariation: 50, latency: 100, latencyVariation: 50 },
      'wifi': { avgSpeed: 300, speedVariation: 100, latency: 50, latencyVariation: 25 }
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.updateStatus();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        this.settings = response.settings;
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Main toggle
    const mainToggle = document.getElementById('main-toggle');
    mainToggle.addEventListener('change', this.handleMainToggle.bind(this));

    // Range inputs
    const rangeInputs = ['avg-speed', 'speed-variation', 'latency', 'latency-variation'];
    rangeInputs.forEach(id => {
      const input = document.getElementById(id);
      const display = document.getElementById(id + '-value');
      
      input.addEventListener('input', (e) => {
        display.textContent = e.target.value;
        this.updateSettingsFromUI();
      });
    });

    // Rule management
    document.getElementById('add-rule').addEventListener('click', this.addRule.bind(this));

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', this.applyPreset.bind(this));
    });

    // Actions
    document.getElementById('save-settings').addEventListener('click', this.saveSettings.bind(this));
    document.getElementById('reset-settings').addEventListener('click', this.resetSettings.bind(this));
  }

  updateUI() {
    // Update main toggle
    document.getElementById('main-toggle').checked = this.settings.enabled;

    // Update range inputs
    document.getElementById('avg-speed').value = this.settings.avgSpeed;
    document.getElementById('avg-speed-value').textContent = this.settings.avgSpeed;
    
    document.getElementById('speed-variation').value = this.settings.speedVariation;
    document.getElementById('speed-variation-value').textContent = this.settings.speedVariation;
    
    document.getElementById('latency').value = this.settings.latency;
    document.getElementById('latency-value').textContent = this.settings.latency;
    
    document.getElementById('latency-variation').value = this.settings.latencyVariation;
    document.getElementById('latency-variation-value').textContent = this.settings.latencyVariation;

    // Update rules
    this.renderRules();
  }

  renderRules() {
    const container = document.getElementById('rules-container');
    container.innerHTML = '';

    this.settings.rules.forEach((rule, index) => {
      const ruleElement = this.createRuleElement(rule, index);
      container.appendChild(ruleElement);
    });
  }

  createRuleElement(rule, index) {
    const div = document.createElement('div');
    div.className = 'rule-item';
    div.innerHTML = `
      <input type="text" class="rule-input" placeholder="URL pattern (regex)" value="${rule.pattern || ''}" data-field="pattern" data-index="${index}">
      <select class="rule-select" data-field="action" data-index="${index}">
        <option value="delay" ${rule.action === 'delay' ? 'selected' : ''}>Delay</option>
        <option value="slow" ${rule.action === 'slow' ? 'selected' : ''}>Slow</option>
        <option value="block" ${rule.action === 'block' ? 'selected' : ''}>Block</option>
      </select>
      <input type="number" class="rule-value" placeholder="ms" value="${rule.value || ''}" data-field="value" data-index="${index}" ${rule.action === 'block' ? 'disabled' : ''}>
      <button class="remove-rule" data-index="${index}">×</button>
    `;

    // Add event listeners
    div.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', this.updateRule.bind(this));
    });

    div.querySelector('.remove-rule').addEventListener('click', this.removeRule.bind(this));

    // Handle action change to disable/enable value input
    const actionSelect = div.querySelector('.rule-select');
    const valueInput = div.querySelector('.rule-value');
    actionSelect.addEventListener('change', () => {
      valueInput.disabled = actionSelect.value === 'block';
      if (actionSelect.value === 'block') {
        valueInput.value = '';
      }
    });

    return div;
  }

  updateRule(e) {
    const index = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    const value = e.target.value;

    if (!this.settings.rules[index]) {
      this.settings.rules[index] = {};
    }

    this.settings.rules[index][field] = value;
    this.updateSettingsFromUI();
  }

  addRule() {
    this.settings.rules.push({
      pattern: '',
      action: 'delay',
      value: 1000
    });
    this.renderRules();
  }

  removeRule(e) {
    const index = parseInt(e.target.dataset.index);
    this.settings.rules.splice(index, 1);
    this.renderRules();
    this.updateSettingsFromUI();
  }

  updateSettingsFromUI() {
    this.settings.avgSpeed = parseInt(document.getElementById('avg-speed').value);
    this.settings.speedVariation = parseInt(document.getElementById('speed-variation').value);
    this.settings.latency = parseInt(document.getElementById('latency').value);
    this.settings.latencyVariation = parseInt(document.getElementById('latency-variation').value);
  }

  async handleMainToggle() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'toggleThrottling' }, (response) => {
        this.settings.enabled = response.enabled;
        this.updateStatusIndicator();
        resolve();
      });
    });
  }

  applyPreset(e) {
    const presetName = e.target.dataset.preset;
    const preset = this.presets[presetName];
    
    if (preset) {
      Object.assign(this.settings, preset);
      this.updateUI();
      this.showNotification(`Applied ${presetName.replace('-', ' ')} preset`);
    }
  }

  async saveSettings() {
    this.updateSettingsFromUI();
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: this.settings 
      }, (response) => {
        if (response.success) {
          this.showNotification('Settings saved successfully');
        }
        resolve();
      });
    });
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      this.settings = {
        enabled: false,
        avgSpeed: 50,
        speedVariation: 30,
        latency: 100,
        latencyVariation: 50,
        rules: []
      };
      
      await this.saveSettings();
      this.updateUI();
      this.showNotification('Settings reset to default');
    }
  }

  async updateStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        this.updateStatusIndicator(response.enabled);
        document.getElementById('active-sessions').textContent = response.totalActiveSessions;
        resolve();
      });
    });
  }

  updateStatusIndicator(enabled = this.settings?.enabled) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    
    if (enabled) {
      indicator.classList.add('active');
      text.textContent = 'Active';
    } else {
      indicator.classList.remove('active');
      text.textContent = 'Disabled';
    }
  }

  showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize the popup controller
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});