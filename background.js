/**
 * Background Service Worker for Network Throttler Pro
 * Manages network throttling using Chrome DevTools Protocol
 */

class NetworkThrottler {
  constructor() {
    this.activeSessions = new Map();
    this.defaultSettings = {
      enabled: false,
      avgSpeed: 50, // KB/s
      speedVariation: 30, // KB/s (0 to avgSpeed + speedVariation)
      latency: 100, // ms
      latencyVariation: 50, // ms
      rules: []
    };
    
    this.initializeExtension();
  }

  async initializeExtension() {
    // Load settings from storage
    const result = await chrome.storage.sync.get(['throttleSettings']);
    this.settings = result.throttleSettings || this.defaultSettings;
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Listen for debugger detach events
    chrome.debugger.onDetach.addListener(this.handleDebuggerDetach.bind(this));
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getSettings':
        sendResponse({ settings: this.settings });
        break;
        
      case 'updateSettings':
        this.settings = request.settings;
        await chrome.storage.sync.set({ throttleSettings: this.settings });
        await this.updateAllSessions();
        sendResponse({ success: true });
        break;
        
      case 'toggleThrottling':
        this.settings.enabled = !this.settings.enabled;
        await chrome.storage.sync.set({ throttleSettings: this.settings });
        await this.updateAllSessions();
        sendResponse({ enabled: this.settings.enabled });
        break;
        
      case 'getStatus':
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const isActive = activeTab ? this.activeSessions.has(activeTab.id) : false;
        sendResponse({ 
          enabled: this.settings.enabled, 
          activeOnCurrentTab: isActive,
          totalActiveSessions: this.activeSessions.size
        });
        break;
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading' && this.settings.enabled) {
      await this.attachToTab(tabId);
    }
  }

  handleTabRemoved(tabId) {
    this.detachFromTab(tabId);
  }

  handleDebuggerDetach(source, reason) {
    if (reason === 'replaced_with_devtools') {
      console.log('DevTools opened, throttling disabled for tab:', source.tabId);
    }
    this.activeSessions.delete(source.tabId);
  }

  async attachToTab(tabId) {
    try {
      // Check if already attached
      if (this.activeSessions.has(tabId)) {
        return;
      }

      // Attach debugger
      await chrome.debugger.attach({ tabId }, '1.3');
      
      // Enable Network domain
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
      
      // Set up network conditions
      await this.applyThrottling(tabId);
      
      this.activeSessions.set(tabId, { attached: true });
      
    } catch (error) {
      console.error('Failed to attach debugger to tab', tabId, error);
    }
  }

  async detachFromTab(tabId) {
    try {
      if (this.activeSessions.has(tabId)) {
        await chrome.debugger.detach({ tabId });
        this.activeSessions.delete(tabId);
      }
    } catch (error) {
      // Tab might already be closed
      this.activeSessions.delete(tabId);
    }
  }

  async applyThrottling(tabId) {
    if (!this.settings.enabled) {
      // Disable throttling
      await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
      });
      return;
    }

    // Calculate random speeds within variation range
    const downloadSpeed = this.calculateSpeed();
    const uploadSpeed = downloadSpeed * 0.8; // Typically upload is slower
    const latency = this.calculateLatency();

    await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
      offline: false,
      latency: latency,
      downloadThroughput: downloadSpeed,
      uploadThroughput: uploadSpeed
    });

    // Set up request interception for custom rules
    if (this.settings.rules.length > 0) {
      await this.setupRequestInterception(tabId);
    }
  }

  async setupRequestInterception(tabId) {
    // Enable request interception
    await chrome.debugger.sendCommand({ tabId }, 'Network.setRequestInterception', {
      patterns: [{ urlPattern: '*' }]
    });

    // Listen for intercepted requests
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId === tabId && method === 'Network.requestIntercepted') {
        this.handleInterceptedRequest(source.tabId, params);
      }
    });
  }

  async handleInterceptedRequest(tabId, params) {
    const url = params.request.url;
    let customDelay = 0;
    let shouldBlock = false;

    // Check custom rules
    for (const rule of this.settings.rules) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(url)) {
          switch (rule.action) {
            case 'delay':
              customDelay = rule.value || 0;
              break;
            case 'slow':
              customDelay = rule.value || 5000;
              break;
            case 'block':
              shouldBlock = true;
              break;
          }
          break; // Use first matching rule
        }
      } catch (error) {
        console.error('Invalid regex pattern:', rule.pattern);
      }
    }

    if (shouldBlock) {
      // Block the request
      await chrome.debugger.sendCommand({ tabId }, 'Network.continueInterceptedRequest', {
        interceptionId: params.interceptionId,
        errorReason: 'ConnectionRefused'
      });
    } else {
      // Continue with delay if specified
      if (customDelay > 0) {
        setTimeout(async () => {
          try {
            await chrome.debugger.sendCommand({ tabId }, 'Network.continueInterceptedRequest', {
              interceptionId: params.interceptionId
            });
          } catch (error) {
            console.error('Failed to continue intercepted request:', error);
          }
        }, customDelay);
      } else {
        await chrome.debugger.sendCommand({ tabId }, 'Network.continueInterceptedRequest', {
          interceptionId: params.interceptionId
        });
      }
    }
  }

  calculateSpeed() {
    const { avgSpeed, speedVariation } = this.settings;
    const minSpeed = Math.max(1, avgSpeed - speedVariation / 2);
    const maxSpeed = avgSpeed + speedVariation / 2;
    const randomSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    return Math.round(randomSpeed * 1024 / 8); // Convert KB/s to bytes/s
  }

  calculateLatency() {
    const { latency, latencyVariation } = this.settings;
    const minLatency = Math.max(0, latency - latencyVariation / 2);
    const maxLatency = latency + latencyVariation / 2;
    return Math.round(minLatency + Math.random() * (maxLatency - minLatency));
  }

  async updateAllSessions() {
    const promises = [];
    for (const [tabId] of this.activeSessions) {
      promises.push(this.applyThrottling(tabId));
    }
    await Promise.all(promises);
  }
}

// Initialize the throttler
new NetworkThrottler();