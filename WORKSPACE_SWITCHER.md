# Workspace Switcher Component

A reusable workspace navigation component for easy switching between Team Claude platforms.

## Features

- 🎯 Fixed floating button for easy access
- 🚀 Quick navigation to all workspaces
- 🎨 Beautiful gradient design matching Team Claude branding
- 📱 Responsive and mobile-friendly
- ⚡ Zero dependencies - pure vanilla JavaScript
- 🔧 Easy to integrate into any HTML page

## Installation

### Method 1: Include in HTML

Add these lines to your HTML file:

```html
<!-- Add the container element -->
<div id="workspace-switcher"></div>

<!-- Include the script -->
<script src="./workspace-switcher.js"></script>
```

The component will automatically initialize when the page loads.

### Method 2: Manual Initialization

If you need more control:

```html
<!-- Add the container element -->
<div id="workspace-switcher"></div>

<!-- Include the script -->
<script src="./workspace-switcher.js"></script>

<!-- Initialize manually -->
<script>
  // Wait for page to load
  window.addEventListener('load', function() {
    WorkspaceSwitcher.init();
  });
</script>
```

## Usage Example

Here's a complete HTML example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Team Claude Page</title>
</head>
<body>
    <h1>Welcome to Team Claude</h1>
    <p>Click the floating button in the bottom-right corner to switch workspaces.</p>
    
    <!-- Workspace Switcher Container -->
    <div id="workspace-switcher"></div>
    
    <!-- Include the component -->
    <script src="./workspace-switcher.js"></script>
</body>
</html>
```

## Customization

### Changing Position

You can customize the button position by adding CSS:

```html
<style>
  .workspace-switcher-button {
    bottom: 100px !important; /* Change vertical position */
    right: 50px !important;   /* Change horizontal position */
  }
  
  .workspace-switcher-menu {
    bottom: 170px !important; /* Adjust menu accordingly */
  }
</style>
```

### Modifying Workspaces

Edit the `workspaces` array in `workspace-switcher.js`:

```javascript
const workspaces = [
  {
    id: 'my-workspace',
    name: 'My Custom Workspace',
    icon: '🎨',
    url: 'https://example.com',
    status: 'live', // 'live' or 'dev'
    color: '#667eea'
  },
  // ... more workspaces
];
```

### Changing Colors

Modify the button gradient:

```html
<style>
  .workspace-switcher-button {
    background: linear-gradient(135deg, #your-color-1, #your-color-2) !important;
  }
</style>
```

## API

### WorkspaceSwitcher.init()

Initializes the workspace switcher component.

```javascript
WorkspaceSatcher.init();
```

### WorkspaceSwitcher.workspaces

Access the list of configured workspaces:

```javascript
console.log(WorkspaceSwitcher.workspaces);
// Returns array of workspace objects
```

## Included Workspaces

The component includes these default workspaces:

1. **Dating Platform** (youandinotai.com) - 🟢 LIVE
2. **Admin Dashboard** (youandinotai.online) - 🔧 Development
3. **Business Dashboard** (local) - 🟢 LIVE
4. **DAO Platform** (aidoesitall.org) - 🔧 Development
5. **AI Marketplace** (ai-solutions.store) - 🔧 Development
6. **Workspace Hub** (workspace-hub.html) - 🟢 LIVE

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Button Not Showing

Make sure you have:
1. Added the container element: `<div id="workspace-switcher"></div>`
2. Included the script: `<script src="./workspace-switcher.js"></script>`
3. The script is loaded after the DOM is ready

### Links Not Working

Check that the URLs in the `workspaces` array are correct and accessible.

### Menu Not Opening

Ensure JavaScript is enabled in your browser and there are no console errors.

## Integration Examples

### Add to Existing Dashboard

```html
<!-- Your existing page content -->
<div class="dashboard">
  <h1>My Dashboard</h1>
  <!-- ... content ... -->
</div>

<!-- Add workspace switcher at the end of body -->
<div id="workspace-switcher"></div>
<script src="./workspace-switcher.js"></script>
```

### Add to React App

```jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Load the workspace switcher script
    const script = document.createElement('script');
    script.src = './workspace-switcher.js';
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return (
    <div className="App">
      <h1>My React App</h1>
      {/* Workspace switcher container */}
      <div id="workspace-switcher"></div>
    </div>
  );
}
```

## Files

- `workspace-switcher.js` - Main component script
- `WORKSPACE_SWITCHER.md` - This documentation
- `workspace-config.json` - Workspace configuration data
- `workspace-hub.html` - Central workspace hub page

## Related Documentation

- [WORKSPACES.md](./WORKSPACES.md) - Complete workspace documentation
- [README.md](./README.md) - Main project documentation
- [workspace-hub.html](./workspace-hub.html) - Visual workspace hub

## Support

For issues or feature requests, please visit:
- GitHub Repository: https://github.com/Trollz1004/Trollz1004
- Email: joshlcoleman@gmail.com

## License

Proprietary - All rights reserved by Trash or Treasure Online Recycler LLC

---

**Built with ❤️ by Team Claude for The Greater Good**
