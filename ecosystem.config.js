/**
 * PM2 Ecosystem Configuration
 * 24/7 Production Deployment - Auto-Restart on Crash/Reboot
 *
 * All services configured for:
 * - Automatic restart on crash
 * - Automatic startup on system boot
 * - Health monitoring
 * - Log management
 * - Cluster mode for scalability
 */

module.exports = {
  apps: [
    // ========================================
    // CLOUDEDROID PLATFORM - Main DAO + AI Marketplace
    // ========================================
    {
      name: 'cloudedroid',
      script: 'cloudedroid-production/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3456
      },
      error_file: './logs/cloudedroid-error.log',
      out_file: './logs/cloudedroid-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ========================================
    // DATING PLATFORM BACKEND - YouAndINotAI
    // ========================================
    {
      name: 'dating-backend',
      script: 'date-app-dashboard/backend/src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dating_platform',
        SQUARE_ENVIRONMENT: 'production',
        SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN
      },
      error_file: './logs/dating-backend-error.log',
      out_file: './logs/dating-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ========================================
    // DATING PLATFORM FRONTEND
    // ========================================
    {
      name: 'dating-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './date-app-dashboard/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5173,
        VITE_API_URL: 'http://localhost:3000'
      },
      error_file: './logs/dating-frontend-error.log',
      out_file: './logs/dating-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ========================================
    // GRANT AUTOMATION WORKER
    // ========================================
    {
      name: 'grant-automation',
      script: 'grant-automation-worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      cron_restart: '0 */6 * * *', // Restart every 6 hours for fresh discovery
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        OLLAMA_HOST: 'http://localhost:11434',
        DATABASE_URL: 'postgresql://cloudedroid:secure_pass_2024@localhost:5432/cloudedroid_prod'
      },
      error_file: './logs/grant-automation-error.log',
      out_file: './logs/grant-automation-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ========================================
    // COMPLIANCE MONITORING SERVICE
    // ========================================
    {
      name: 'compliance-monitor',
      script: 'compliance-monitor-worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      cron_restart: '0 0 * * *', // Restart daily at midnight
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://cloudedroid:secure_pass_2024@localhost:5432/cloudedroid_prod'
      },
      error_file: './logs/compliance-monitor-error.log',
      out_file: './logs/compliance-monitor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ========================================
    // HEALTH MONITORING DASHBOARD
    // ========================================
    {
      name: 'health-dashboard',
      script: 'health-dashboard.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3457,
        CLOUDEDROID_URL: 'http://localhost:3456',
        DATING_URL: 'http://localhost:3000'
      },
      error_file: './logs/health-dashboard-error.log',
      out_file: './logs/health-dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ],

  // ========================================
  // DEPLOYMENT CONFIGURATION
  // ========================================
  deploy: {
    production: {
      user: 'node',
      host: ['71.52.23.215'],
      ref: 'origin/main',
      repo: 'https://github.com/Trollz1004/Trollz1004.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
