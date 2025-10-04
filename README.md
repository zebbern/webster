# PageLoad Extractor

A web application for extracting and organizing website content using Puppeteer. Extract interactive elements and images from any website with automatic categorization and filtering capabilities.

## Features

- Extract interactive elements (buttons, links, forms) from any website
- Automatic content categorization (Images, Navigation, Buttons, Forms, Data, Other)
- Image viewer with format filtering (JPG, JPEG, PNG, WebP, GIF, SVG)
- Starred navigation system for quick access to frequently used links
- Dark theme interface with responsive design
- Real-time filtering and search functionality

## Installation

```bash
git clone https://github.com/zebbern/Webster.git
cd Webster
npm install
```

## Usage

### Development
```bash
npm run dev
```
Access the application at `http://localhost:3001`

### Production
```bash
npm start
```

## How to Use

1. Enter a website URL in the input field
2. Click "Run" to extract content from the website
3. Browse extracted content organized by category
4. Use "View Images" to see all images in a dedicated viewer
5. Star frequently used navigation links for quick access
6. Filter results using the search boxes in each category

## API

The application provides a REST API endpoint:

```
POST /api/extract
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Returns categorized content including images, interactive elements, and metadata.

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Puppeteer
- **Content Extraction**: Puppeteer for dynamic content rendering
- **Storage**: localStorage for user preferences and starred items

## Requirements

- Node.js 22.x or higher
- Modern web browser
- Internet connection for content extraction

## License

ISC