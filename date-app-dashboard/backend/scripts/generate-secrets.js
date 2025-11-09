#!/usr/bin/env node

/**
 * Generate secure secrets for the dating app backend
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Generating secure secrets for Team Claude Dating App Backend\n');
console.log('Copy these values to your Railway environment variables:\n');
console.log('=' .repeat(80));

// Generate RSA key pair for JWT
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('\n📝 JWT Keys (copy these exactly as-is, including newlines):');
console.log('\nJWT_PUBLIC_KEY=');
console.log(publicKey);
console.log('\nJWT_PRIVATE_KEY=');
console.log(privateKey);

// Generate random secrets
console.log('\n🔑 Security Secrets (random hex strings):');
console.log('\nREFRESH_TOKEN_PEPPER=' + crypto.randomBytes(32).toString('hex'));
console.log('VERIFICATION_CODE_PEPPER=' + crypto.randomBytes(16).toString('hex'));
console.log('PHONE_SALT=' + crypto.randomBytes(16).toString('hex'));
console.log('ENCRYPTION_SECRET=' + crypto.randomBytes(32).toString('hex'));

console.log('\n' + '='.repeat(80));
console.log('\n✅ Secrets generated successfully!');
console.log('\n📋 Next steps:');
console.log('1. Go to your Railway project: https://railway.app/dashboard');
console.log('2. Select your backend service');
console.log('3. Go to Variables tab');
console.log('4. Add each variable above (copy-paste exactly)');
console.log('5. Add PostgreSQL database connection variables');
console.log('6. Deploy your service\n');
