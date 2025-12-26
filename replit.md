# WhatsApp Group Link Extractor - Chrome Extension

## Overview
This is a Chrome Extension that extracts WhatsApp group invite links from web pages and Google search results. The extension is built using TypeScript, React, and Webpack.

## Project Type
Chrome Browser Extension (not a traditional web app)

## Features

### Core Features
- Extract WhatsApp group links from regular web pages
- Batch extract from Google search results (up to 50 concurrent requests)
- Copy links as text or JSON format
- Download links as CSV file
- Activity logging with fetch progress tracking

### Link Validation Feature (NEW)
- **Health Check**: Validate extracted links with lightweight fetch HEAD requests
- **Status Indicators**: 
  - 🟢 Active: Link is working and accessible
  - 🔴 Expired: Link returned 404/410 or timeout
  - 🟡 Invalid: Link returned error or network issues
  - ⚫ Rate-limited: Server rejected request (429)
- **Smart Caching**: Validation results cached for 24 hours
- **On-demand Recheck**: "Validate links" button to manually recheck all links
- **Last Validated Timestamp**: Shows when each link was last checked

## Project Structure
```
├── public/           # Static assets and manifest.json
│   ├── manifest.json # Chrome extension manifest
│   └── images/       # Extension icons
├── src/
│   ├── background.ts # Service worker for the extension
│   ├── popup/        # React popup UI
│   ├── components/   # React components
│   ├── validation.ts # Link validation logic
│   └── utils.ts      # Utility functions
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
- Bottleneck (rate limiting)
- Cheerio (HTML parsing)

## Workflows
- **Extension Server**: Serves the built extension files on port 5000 for preview and download

## Recent Changes
- Added link validation system with health status indicators
- Implemented browser storage caching for validation results (24-hour TTL)
- Added "Validate links" button to UI for on-demand validation
- Validation results display with color-coded status badges and timestamps
