#!/usr/bin/env node
/**
 * Install missing Node.js dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Installing Node.js dependencies...');

try {
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
        console.error('❌ package.json not found');
        process.exit(1);
    }

    // Install dependencies
    console.log('📦 Running npm install...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully!');
    
    // Test if dotenv can be loaded
    console.log('🧪 Testing dotenv module...');
    require('dotenv').config();
    console.log('✅ dotenv module working correctly');
    
    // Test other critical modules
    console.log('🧪 Testing other modules...');
    require('./logger');
    require('./sessionManager');
    console.log('✅ All modules loaded successfully');
    
} catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
} 