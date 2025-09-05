/**
 * Content Script for Network Throttler Pro
 * Injects monitoring and additional throttling capabilities
 */

(() => {
  'use strict';
  
  class NetworkMonitor {
    constructor() {
      this.originalFetch = window.fetch;
      this.originalXHROpen = XMLHttpRequest.prototype.open;
      this.originalXHRSend = XMLHttpRequest.prototype.send;
      
      this.isThrottlingEnabled = false;
      this.settings = null;
      
      this.init();
    }

    init() {
      this.listenForSettingsUpdates();
      this.patchNetworkMethods();
      this.injectThrottlingScript();
    }

    listenForSettingsUpdates() {
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateThrottleSettings') {
          this.settings = request.settings;
          this.isThrottlingEnabled = request.settings.enabled;
          this.updateInjectedScript();
        }
      });

      // Request current settings
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response && response.settings) {
          this.settings = response.settings;
          this.isThrottlingEnabled = response.settings.enabled;
        }
      });
    }

    patchNetworkMethods() {
      // Patch fetch API
      window.fetch = (...args) => {
        const [url, options] = args;
        
        if (this.isThrottlingEnabled) {
          const delay = this.calculateDelayForURL(url);
          if (delay > 0) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(this.originalFetch.apply(window, args));
              }, delay);
            });
          }
        }
        
        return this.originalFetch.apply(window, args);
      };

      // Patch XMLHttpRequest
      XMLHttpRequest.prototype.open = function(...args) {
        this._throttlerURL = args[1];
        return window.networkMonitor.originalXHROpen.apply(this, args);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        if (window.networkMonitor.isThrottlingEnabled && this._throttlerURL) {
          const delay = window.networkMonitor.calculateDelayForURL(this._throttlerURL);
          if (delay > 0) {
            setTimeout(() => {
              window.networkMonitor.originalXHRSend.apply(this, args);
            }, delay);
            return;
          }
        }
        
        return window.networkMonitor.originalXHRSend.apply(this, args);
      };
    }

    calculateDelayForURL(url) {
      if (!this.settings || !this.settings.rules) return 0;
      
      for (const rule of this.settings.rules) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(url)) {
            switch (rule.action) {
              case 'delay':
                return parseInt(rule.value) || 0;
              case 'slow':
                return parseInt(rule.value) || 5000;
              case 'block':
                // For blocking, we'll throw an error
                throw new Error('Network request blocked by throttler');
            }
          }
        } catch (error) {
          if (error.message.includes('blocked by throttler')) {
            throw error;
          }
          // Invalid regex, skip this rule
          continue;
        }
      }
      
      return 0;
    }

    injectThrottlingScript() {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    }

    updateInjectedScript() {
      // Send updated settings to injected script
      window.postMessage({
        type: 'THROTTLER_SETTINGS_UPDATE',
        settings: this.settings
      }, '*');
    }
  }

  // Only initialize if we're in the main frame
  if (window === window.top) {
    window.networkMonitor = new NetworkMonitor();
  }
})();