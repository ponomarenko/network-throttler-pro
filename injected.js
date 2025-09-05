/**
 * Injected Script for Network Throttler Pro
 * Runs in the page context for deeper network interception
 */

(() => {
  "use strict";

  class DeepNetworkThrottler {
    constructor() {
      this.settings = null;
      this.isEnabled = false;

      // Store original methods
      this.originalMethods = {
        fetch: window.fetch,
        xhrOpen: XMLHttpRequest.prototype.open,
        xhrSend: XMLHttpRequest.prototype.send,
        createElement: document.createElement,
        appendChild: Node.prototype.appendChild,
        insertBefore: Node.prototype.insertBefore,
      };

      this.init();
    }

    init() {
      this.listenForSettings();
      this.patchResourceLoading();
      this.addVisualIndicator();
    }

    listenForSettings() {
      window.addEventListener("message", (event) => {
        if (event.data.type === "THROTTLER_SETTINGS_UPDATE") {
          this.settings = event.data.settings;
          this.isEnabled = event.data.settings.enabled;
          this.updateVisualIndicator();
        }
      });
    }

    patchResourceLoading() {
      // Patch image loading
      const originalCreateElement = this.originalMethods.createElement;
      document.createElement = (tagName) => {
        const element = originalCreateElement.call(document, tagName);

        if (tagName.toLowerCase() === "img") {
          this.patchImageElement(element);
        } else if (tagName.toLowerCase() === "script") {
          this.patchScriptElement(element);
        } else if (tagName.toLowerCase() === "link") {
          this.patchLinkElement(element);
        }

        return element;
      };

      // Patch dynamic resource insertion
      // Node.prototype.appendChild = function (child) {
      //   if (window.deepThrottler && window.deepThrottler.isEnabled) {
      //     window.deepThrottler.handleResourceInsertion(child);
      //   }
      //   return window.deepThrottler.originalMethods.appendChild.call(
      //     this,
      //     child
      //   );
      // };
    }

    patchImageElement(img) {
      const originalSrcSetter = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype,
        "src"
      ).set;

      Object.defineProperty(img, "src", {
        get() {
          return this._throttlerSrc || "";
        },
        set(value) {
          this._throttlerSrc = value;

          if (window.deepThrottler && window.deepThrottler.isEnabled) {
            const delay = window.deepThrottler.calculateDelayForURL(value);
            if (delay > 0) {
              setTimeout(() => {
                originalSrcSetter.call(this, value);
              }, delay);
              return;
            }
          }

          originalSrcSetter.call(this, value);
        },
      });
    }

    patchScriptElement(script) {
      const originalSrcSetter = Object.getOwnPropertyDescriptor(
        HTMLScriptElement.prototype,
        "src"
      ).set;

      Object.defineProperty(script, "src", {
        get() {
          return this._throttlerSrc || "";
        },
        set(value) {
          this._throttlerSrc = value;

          if (window.deepThrottler && window.deepThrottler.isEnabled) {
            const delay = window.deepThrottler.calculateDelayForURL(value);
            if (delay > 0) {
              setTimeout(() => {
                originalSrcSetter.call(this, value);
              }, delay);
              return;
            }
          }

          originalSrcSetter.call(this, value);
        },
      });
    }

    patchLinkElement(link) {
      const originalHrefSetter = Object.getOwnPropertyDescriptor(
        HTMLLinkElement.prototype,
        "href"
      ).set;

      Object.defineProperty(link, "href", {
        get() {
          return this._throttlerHref || "";
        },
        set(value) {
          this._throttlerHref = value;

          if (
            window.deepThrottler &&
            window.deepThrottler.isEnabled &&
            link.rel === "stylesheet"
          ) {
            const delay = window.deepThrottler.calculateDelayForURL(value);
            if (delay > 0) {
              setTimeout(() => {
                originalHrefSetter.call(this, value);
              }, delay);
              return;
            }
          }

          originalHrefSetter.call(this, value);
        },
      });
    }

    handleResourceInsertion(child) {
      if (!this.isEnabled) return;

      if (child.tagName === "SCRIPT" && child.src) {
        const delay = this.calculateDelayForURL(child.src);
        if (delay > 0) {
          const originalSrc = child.src;
          child.src = "";
          setTimeout(() => {
            child.src = originalSrc;
          }, delay);
        }
      }
    }

    calculateDelayForURL(url) {
      if (!this.settings || !this.settings.rules) return 0;

      for (const rule of this.settings.rules) {
        try {
          const regex = new RegExp(rule.pattern, "i");
          if (regex.test(url)) {
            switch (rule.action) {
              case "delay":
                return parseInt(rule.value) || 0;
              case "slow":
                return parseInt(rule.value) || 5000;
              case "block":
                return -1; // Special value for blocking
            }
          }
        } catch (error) {
          continue;
        }
      }

      return 0;
    }

    addVisualIndicator() {
      const indicator = document.createElement("div");
      indicator.id = "network-throttler-indicator";
      indicator.innerHTML = "🐌";
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
      `;

      indicator.addEventListener("click", this.showThrottleInfo.bind(this));
      indicator.title = "Network Throttling Active - Click for details";

      document.body?.appendChild(indicator) ||
        document.documentElement?.appendChild(indicator);

      this.indicator = indicator;
    }

    updateVisualIndicator() {
      if (!this.indicator) return;

      if (this.isEnabled) {
        this.indicator.style.display = "flex";
        this.indicator.style.background = "rgba(255, 152, 0, 0.8)";
      } else {
        this.indicator.style.display = "none";
      }
    }

    showThrottleInfo() {
      if (!this.settings) return;

      const info = `Network Throttling Active
Average Speed: ${this.settings.avgSpeed} KB/s
Speed Variation: ±${this.settings.speedVariation} KB/s
Latency: ${this.settings.latency}ms (±${this.settings.latencyVariation}ms)
Active Rules: ${this.settings.rules.length}`;

      alert(info);
    }
  }

  // Initialize the deep throttler
  if (!window.deepThrottler) {
    window.deepThrottler = new DeepNetworkThrottler();
  }
})();
