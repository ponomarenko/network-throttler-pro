# Network Throttler Pro

A powerful Chrome extension for simulating poor network conditions with advanced customization options. Perfect for testing web applications under various network scenarios.

## Features

### 🚀 Core Functionality
- **Flexible Speed Control**: Set average speeds with configurable variation ranges
- **Dynamic Latency**: Simulate realistic network latency with randomization
- **Real-time Toggle**: Enable/disable throttling instantly
- **Visual Indicators**: On-page indicators when throttling is active

### 🎯 Advanced Features
- **Custom Rules**: Define specific throttling rules for different URLs using regex patterns
- **Multiple Actions**: Delay, slow down, or completely block specific resources
- **Quick Presets**: Pre-configured settings for common network conditions (3G, 4G, WiFi)
- **Deep Integration**: Intercepts various types of network requests including XHR, Fetch, and resource loading

### 🛠 Technical Capabilities
- Uses Chrome DevTools Protocol for accurate network emulation
- Content script injection for comprehensive request interception
- Persistent settings storage
- Session management across multiple tabs

## Installation

### From Release Package
1. Download the latest release from the [Releases](../../releases) page
2. Extract the ZIP file to a local directory
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted directory

### Development Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/network-throttler-pro.git
   cd network-throttler-pro
   ```
2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

## Usage

### Basic Throttling
1. Click the extension icon in the Chrome toolbar
2. Toggle "Enable Throttling" to activate
3. Adjust the speed and latency settings using the sliders
4. Settings are applied immediately to active tabs

### Speed Settings
- **Average Speed**: Base download speed in KB/s
- **Speed Variation**: Range of speed fluctuation (±KB/s)
- **Base Latency**: Network latency in milliseconds
- **Latency Variation**: Range of latency fluctuation (±ms)

### Custom Rules
Create specific rules for different URLs or resources:

1. Click "Add Rule" in the Custom Rules section
2. Enter a regex pattern to match URLs
3. Choose an action:
   - **Delay**: Add specific delay in milliseconds
   - **Slow**: Apply heavy throttling (default 5000ms)
   - **Block**: Completely block the resource
4. Set the delay value (not applicable for block action)

#### Example Rules
- `\.css$` - Target all CSS files
- `googleapis\.com` - Target Google APIs
- `\.(jpg|jpeg|png|gif)$` - Target image files
- `api/data` - Target specific API endpoints

### Quick Presets
Use predefined network conditions:
- **Slow 3G**: 25 KB/s with high latency
- **Fast 3G**: 75 KB/s with moderate latency
- **Slow 4G**: 150 KB/s with low latency
- **Slow WiFi**: 300 KB/s with minimal latency

## Technical Implementation

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Background     │    │  Content Script │
│   (popup.js)    │◄──►│  Service Worker │◄──►│  (content.js)   │
│                 │    │  (background.js)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Chrome DevTools│    │  Injected Script│
                    │  Protocol API   │    │  (injected.js)  │
                    └─────────────────┘    └─────────────────┘
```

### Key Components

#### Background Service Worker (`background.js`)
- Manages Chrome DevTools Protocol connections
- Handles network condition emulation
- Stores and retrieves user settings
- Coordinates throttling across multiple tabs

#### Content Script (`content.js`)
- Intercepts network requests in page context
- Patches Fetch API and XMLHttpRequest
- Communicates with background script
- Injects additional throttling logic

#### Injected Script (`injected.js`)
- Runs in page context for deep integration
- Handles resource loading (images, scripts, stylesheets)
- Provides visual feedback
- Implements custom rule matching

#### Popup Interface (`popup.html/js/css`)
- User-friendly configuration interface
- Real-time settings adjustment
- Rule management system
- Status monitoring

## Development

### Project Structure
```
network-throttler-pro/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── injected.js           # Page context script
├── popup.html            # Popup interface
├── popup.js             # Popup logic
├── popup.css            # Popup styling
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Building for Distribution
1. Ensure all files are in the project directory
2. Test the extension thoroughly
3. Create a ZIP archive of all files
4. Upload to Chrome Web Store or distribute as needed

### API Permissions
The extension requires the following permissions:
- `debugger`: For network emulation via DevTools Protocol
- `activeTab`: For current tab access
- `storage`: For settings persistence
- `tabs`: For tab management
- `<all_urls>`: For universal URL access

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Other Browsers**: Not supported (Chrome-specific APIs)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

### Development Guidelines
- Follow JavaScript ES6+ standards
- Maintain consistent code formatting
- Add comments for complex logic
- Test across different websites and scenarios
- Ensure proper error handling

## Troubleshooting

### Common Issues

**Extension doesn't activate**
- Ensure Chrome DevTools are not open for the target tab
- Check that the extension has required permissions
- Try refreshing the target page

**Settings not persisting**
- Verify Chrome storage permissions
- Check browser storage quota
- Try resetting settings to default

**Performance Issues**
- Reduce speed variation ranges
- Limit number of custom rules
- Use specific regex patterns to avoid over-matching

### Debug Mode
Enable debug logging by opening Chrome DevTools and checking the Console tab while the extension is active.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Basic network throttling functionality
- Custom rules system
- Quick presets
- Visual indicators
- Persistent settings

## Support

For issues and feature requests, please use the [GitHub Issues](../../issues) page.

## Acknowledgments

- Chrome Extension APIs documentation
- Chrome DevTools Protocol specification
- Community feedback and testing