module.exports = {
  apps: [
    {
      name: 'teamclaude-backend',
      script: 'date-app-dashboard/backend/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'teamclaude-frontend',
      script: 'serve',
      args: '-s date-app-dashboard/frontend/dist -l 3000',
      instances: 1,
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
