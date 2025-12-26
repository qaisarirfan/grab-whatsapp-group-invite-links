# WhatsApp Group Link Extractor - Chrome Extension

## Overview
This is a Chrome Extension that extracts WhatsApp group invite links from web pages and Google search results. The extension is built using TypeScript, React, and Webpack.

## Project Type
Chrome Browser Extension (not a traditional web app)

## Project Structure
```
├── public/           # Static assets and manifest.json
│   ├── manifest.json # Chrome extension manifest
│   └── images/       # Extension icons
├── src/
│   ├── background.ts # Service worker for the extension
│   ├── popup/        # React popup UI
│   └── components/   # React components
├── webpack/          # Webpack configuration files
├── dist/             # Built extension output (generated)
└── server.js         # Simple file server for previewing built files
```

## Development

### Build the extension
```bash
npm run build
```

### Watch mode (for development)
```bash
npm run watch
```

### Preview built files
```bash
node server.js
```

## How to Install the Extension
1. Run `npm run build` to compile the extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `dist` folder

## Tech Stack
- TypeScript
- React 19
- Webpack 5
- Styled Components

## Workflows
- **Extension Server**: Serves the built extension files on port 5000 for preview and download
