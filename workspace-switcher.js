/**
 * Team Claude Workspace Switcher
 * A reusable component for workspace navigation
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="./workspace-switcher.js"></script>
 * 2. Add the switcher button: <div id="workspace-switcher"></div>
 * 3. Initialize: WorkspaceSwitcher.init();
 */

const WorkspaceSwitcher = (function() {
  'use strict';

  const workspaces = [
    {
      id: 'dating-platform',
      name: 'Dating Platform',
      icon: '💝',
      url: 'https://youandinotai.com',
      status: 'live',
      color: '#f5576c'
    },
    {
      id: 'admin-dashboard',
      name: 'Admin Dashboard',
      icon: '⚙️',
      url: 'https://youandinotai.online',
      status: 'dev',
      color: '#00f2fe'
    },
    {
      id: 'business-dashboard',
      name: 'Business Dashboard',
      icon: '📊',
      url: './dashboard-youandinotai-online/index.html',
      status: 'live',
      color: '#330867'
    },
    {
      id: 'dao-platform',
      name: 'DAO Platform',
      icon: '🏛️',
      url: 'https://aidoesitall.org',
      status: 'dev',
      color: '#38f9d7'
    },
    {
      id: 'ai-marketplace',
      name: 'AI Marketplace',
      icon: '🛒',
      url: 'https://ai-solutions.store',
      status: 'dev',
      color: '#fee140'
    },
    {
      id: 'workspace-hub',
      name: 'Workspace Hub',
      icon: '🏠',
      url: './workspace-hub.html',
      status: 'live',
      color: '#667eea'
    }
  ];

  const styles = `
    .workspace-switcher-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      z-index: 9999;
      transition: all 0.3s ease;
    }
    
    .workspace-switcher-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    
    .workspace-switcher-menu {
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 15px;
      min-width: 280px;
      max-height: 500px;
      overflow-y: auto;
      z-index: 9998;
      display: none;
      animation: slideUp 0.3s ease;
    }
    
    .workspace-switcher-menu.open {
      display: block;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .workspace-switcher-header {
      padding: 10px;
      border-bottom: 2px solid #f0f0f0;
      margin-bottom: 10px;
    }
    
    .workspace-switcher-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
    
    .workspace-switcher-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin: 5px 0;
      border-radius: 10px;
      text-decoration: none;
      color: #333;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .workspace-switcher-item:hover {
      background: #f5f5f5;
      transform: translateX(5px);
    }
    
    .workspace-switcher-icon {
      font-size: 24px;
      margin-right: 12px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
    
    .workspace-switcher-info {
      flex: 1;
    }
    
    .workspace-switcher-name {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 2px;
    }
    
    .workspace-switcher-status {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-live {
      color: #10b981;
    }
    
    .status-dev {
      color: #f59e0b;
    }
    
    .workspace-switcher-footer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
    }
    
    .workspace-switcher-footer a {
      color: #667eea;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
    }
    
    .workspace-switcher-footer a:hover {
      text-decoration: underline;
    }
  `;

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  function createSwitcher() {
    const container = document.getElementById('workspace-switcher');
    if (!container) {
      console.warn('Workspace Switcher: Container element with id "workspace-switcher" not found');
      return;
    }

    // Create button
    const button = document.createElement('button');
    button.className = 'workspace-switcher-button';
    button.innerHTML = '🚀';
    button.title = 'Switch Workspace';

    // Create menu
    const menu = document.createElement('div');
    menu.className = 'workspace-switcher-menu';

    // Header
    const header = document.createElement('div');
    header.className = 'workspace-switcher-header';
    header.innerHTML = '<h3 class="workspace-switcher-title">Team Claude Workspaces</h3>';
    menu.appendChild(header);

    // Workspace items
    workspaces.forEach(workspace => {
      const item = document.createElement('a');
      item.className = 'workspace-switcher-item';
      item.href = workspace.url;
      if (workspace.url.startsWith('http')) {
        item.target = '_blank';
      }

      const icon = document.createElement('div');
      icon.className = 'workspace-switcher-icon';
      icon.style.background = workspace.color + '20';
      icon.textContent = workspace.icon;

      const info = document.createElement('div');
      info.className = 'workspace-switcher-info';

      const name = document.createElement('div');
      name.className = 'workspace-switcher-name';
      name.textContent = workspace.name;

      const status = document.createElement('div');
      status.className = `workspace-switcher-status status-${workspace.status}`;
      status.textContent = workspace.status === 'live' ? '🟢 LIVE' : '🔧 Development';

      info.appendChild(name);
      info.appendChild(status);

      item.appendChild(icon);
      item.appendChild(info);

      menu.appendChild(item);
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'workspace-switcher-footer';
    footer.innerHTML = '<a href="./WORKSPACES.md">📖 View Documentation</a>';
    menu.appendChild(footer);

    // Toggle menu
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Append to container
    container.appendChild(button);
    container.appendChild(menu);
  }

  function init() {
    // Inject styles
    injectStyles();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createSwitcher);
    } else {
      createSwitcher();
    }
  }

  // Auto-init if container exists
  if (document.getElementById('workspace-switcher')) {
    init();
  }

  // Public API
  return {
    init: init,
    workspaces: workspaces
  };
})();

// Auto-initialize
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkspaceSwitcher;
}
