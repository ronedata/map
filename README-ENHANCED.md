# Map Explorer - Enhanced Version

বাংলাদেশ ভৌগোলিক মানচিত্র ডেটা ব্রাউজার (উন্নত সংস্করণ)

## 🆕 নতুন Features

### 1. **Modular Architecture**
- কোডবেস refactor করা হয়েছে ES6 modules এ
- পরিষ্কার separation of concerns
- সহজে maintain এবং extend করা যায়

### 2. **Code Quality Improvements**

#### JSDoc Documentation
সব functions এ type-safe JSDoc comments যোগ করা হয়েছে:
```javascript
/**
 * Sanitizes HTML string to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) { ... }
```

#### XSS Protection
- Input sanitization utilities
- HTML escaping functions
- Safe file name handling

### 3. **Error Handling & Resilience**

#### Retry Logic with Exponential Backoff
```javascript
// Automatically retries failed operations
await retryWithBackoff(fetchFunction, {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000
});
```

#### Offline Detection
- Real-time network status monitoring
- Automatic notifications যখন offline/online হয়
- Offline অবস্থায় data loading prevent করা

#### Better Error Messages
- Actionable error messages with retry buttons
- User-friendly Bengali error descriptions
- Context-specific error handling

### 4. **Search Functionality**

#### Global Search
- সব loaded data তে search করুন (districts, upazilas, mouzas)
- Real-time search results
- Debounced input (300ms) for performance
- Hierarchical path display

#### Features:
- Minimum 2 characters to trigger search
- Clear button to reset search
- Click on result to navigate (future enhancement)

### 5. **Favorites/Bookmarks System**

#### Add to Favorites
- যেকোনো file favorites এ যোগ করুন
- localStorage তে persist করা হয়
- Star icon দিয়ে visual indication

#### Favorites Panel
- Collapsible panel
- Quick access to favorite files
- Remove from favorites option
- Shows file metadata (name, size, path)

### 6. **Recent Items History**

#### Automatic Tracking
- সব downloaded files automatically recent history তে যোগ হয়
- Maximum 10 recent items রাখা হয়
- Most recent first order

#### Recent Panel
- Collapsible panel
- Shows access time (relative: "২ ঘণ্টা আগে")
- Clear all option
- Click to re-download

### 7. **File Filters**

#### Filter by Type
- সব ফাইল
- ছবি (images)
- PDF files
- ডকুমেন্ট (documents)
- অন্যান্য (others)

#### Filter by Size
- ছোট (< 1 MB)
- মাঝারি (1-5 MB)
- বড় (> 5 MB)

#### Features:
- Real-time filtering
- Filter status indicator
- Reset filters button
- Filter summary display

## 📁 Project Structure

```
map/
├── index.html                    # Original version
├── index-enhanced.html          # Enhanced version with new features
├── app.js                       # Original app
├── styles.css                   # Shared styles
├── Code.gs                      # Google Apps Script backend
├── Data/                        # Geographic data
│   └── [division files]
└── js/                          # New modular code
    ├── app-enhanced.js          # Enhanced main application
    ├── modules/                 # Feature modules
    │   ├── search.js           # Search functionality
    │   ├── favorites.js        # Favorites management
    │   ├── recent.js           # Recent items tracking
    │   └── filters.js          # File filtering
    └── utils/                   # Utility modules
        ├── sanitizer.js        # XSS protection & sanitization
        ├── retry.js            # Retry logic with backoff
        ├── offline.js          # Offline detection
        └── storage.js          # localStorage operations
```

## 🚀 Usage

### Running the Enhanced Version

1. **Open Enhanced Version:**
   ```
   index-enhanced.html
   ```

2. **Or use original version:**
   ```
   index.html
   ```

### Module System Requirements

Enhanced version uses ES6 modules. Ensure:
- Files served via HTTP/HTTPS (not `file://` protocol)
- Modern browser with ES6 module support

### Local Development

**Using Laragon (Current Setup):**
```
http://localhost/map/index-enhanced.html
```

**Using Python:**
```bash
cd c:\laragon\www\map
python -m http.server 8000
# Visit: http://localhost:8000/index-enhanced.html
```

**Using Node.js:**
```bash
npx http-server .
```

## 🔧 Configuration

### API Endpoint
Edit in `js/app-enhanced.js`:
```javascript
Config: {
  API_BASE: 'your-apps-script-url',
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}
```

### Storage Keys
Edit in `js/utils/storage.js`:
```javascript
const STORAGE_KEYS = {
  FAVORITES: 'map_explorer_favorites',
  RECENT: 'map_explorer_recent',
  PREFERENCES: 'map_explorer_preferences'
};
```

## 📊 Feature Comparison

| Feature | Original | Enhanced |
|---------|----------|----------|
| Cascading Dropdowns | ✅ | ✅ |
| File Download | ✅ | ✅ |
| CAPTCHA | ✅ (Simple) | ✅ (Same) |
| **Modular Code** | ❌ | ✅ |
| **JSDoc Comments** | ❌ | ✅ |
| **XSS Protection** | ❌ | ✅ |
| **Retry Logic** | ❌ | ✅ |
| **Offline Detection** | ❌ | ✅ |
| **Better Errors** | ❌ | ✅ |
| **Search** | ❌ | ✅ |
| **Favorites** | ❌ | ✅ |
| **Recent Items** | ❌ | ✅ |
| **Filters** | ❌ | ✅ |

## 🔒 Security Improvements

### Input Sanitization
```javascript
import { sanitizeHTML, escapeHTML } from './utils/sanitizer.js';

// All user inputs sanitized
const safe = escapeHTML(userInput);
```

### XSS Prevention
- HTML content escaped before rendering
- File names sanitized
- URL parameters encoded

### Network Security
- Offline detection prevents unnecessary requests
- Retry logic handles network failures gracefully

## 💾 Data Persistence

### localStorage Usage

**Favorites:**
```javascript
// Stored as JSON array
[
  {
    id: "file-id",
    name: "file-name.pdf",
    path: "Division → District → Upazila",
    mimeType: "application/pdf",
    size: 1234567,
    addedAt: "2026-01-21T10:30:00.000Z"
  }
]
```

**Recent Items:**
```javascript
// Stored as JSON array (max 10 items)
[
  {
    id: "file-id",
    name: "file-name.pdf",
    path: "Division → District → Upazila",
    mimeType: "application/pdf",
    size: 1234567,
    accessedAt: "2026-01-21T10:30:00.000Z"
  }
]
```

### Clearing Data

Open browser console:
```javascript
localStorage.clear(); // Clear all data
```

Or use browser DevTools → Application → Local Storage

## 🎨 UI/UX Improvements

### Responsive Layout
- 2-column layout on desktop (main content + sidebar)
- Stacked layout on mobile
- Bootstrap 5.3.3 grid system

### Visual Feedback
- Loading spinners during operations
- Progress bars for downloads
- Success/error notifications
- Offline status banner

### Collapsible Panels
- Search panel (always open)
- Favorites panel (collapsible)
- Recent items panel (collapsible)
- Filters panel (collapsible)

## 🐛 Known Limitations

1. **Search**: শুধু loaded division data তে search করে (all divisions নয়)
2. **CAPTCHA**: এখনো simple math-based (future: reCAPTCHA v3)
3. **Download Progress**: Real progress tracking এখনো implement করা হয়নি
4. **Offline Mode**: শুধু detection, actual offline functionality নেই
5. **Search Result Navigation**: Result click করলে navigate করে না (placeholder)

## 🔮 Future Enhancements

### Planned Features:
- [ ] Real download progress tracking with percentage
- [ ] Google reCAPTCHA v3 integration
- [ ] Full offline PWA support with Service Worker
- [ ] Cross-division search
- [ ] Export favorites/recent as JSON
- [ ] Dark mode support
- [ ] Keyboard shortcuts (Ctrl+F for search, Ctrl+K for quick access)
- [ ] Breadcrumb navigation
- [ ] Session state preservation
- [ ] Analytics integration
- [ ] Unit & E2E tests

## 📝 Development Notes

### Adding New Modules

1. Create module in `js/modules/` or `js/utils/`
2. Export functions:
   ```javascript
   export function myFunction() { ... }
   ```
3. Import in `app-enhanced.js`:
   ```javascript
   import { myFunction } from './modules/mymodule.js';
   ```

### Testing Locally

1. Start local server (Laragon, Python, Node.js)
2. Open DevTools (F12)
3. Check Console for errors
4. Test features:
   - Search (type 2+ chars)
   - Add to favorites (star icon)
   - Download file (check recent items)
   - Apply filters
   - Go offline (DevTools → Network → Offline)

## 🤝 Contributing

### Code Style
- Use JSDoc comments for all functions
- Sanitize all user inputs
- Handle errors gracefully with user-friendly messages
- Keep functions small and focused
- Follow existing naming conventions

### File Organization
- **Modules**: Feature-specific code
- **Utils**: Reusable utility functions
- **Main App**: Orchestration and initialization

## 📄 License

Same as original project.

## 👏 Credits

Enhanced by Claude Code (Anthropic)
Original by Edge Team

---

## Quick Start Guide

1. **Open**: `index-enhanced.html`
2. **Select Division**: Choose from dropdown
3. **Navigate**: District → Upazila → Survey Type → Mouza
4. **Search**: Type in search box (2+ chars)
5. **Add Favorite**: Click star icon on file
6. **Download**: Click download button → Solve CAPTCHA
7. **View Recent**: Expand "সাম্প্রতিক আইটেম" panel
8. **Filter**: Expand "ফিল্টার" panel and select options

Enjoy the enhanced Map Explorer! 🗺️✨
