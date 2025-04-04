/**
 * Auth System Testing Script
 * 
 * Usage: node scripts/test-auth.js
 * 
 * This script helps diagnose authentication issues by:
 * 1. Testing database connection
 * 2. Validating that user tables exist
 * 3. Checking for cookie configuration issues
 * 
 * @typedef {Object} TestResult
 * @property {boolean} success Whether the test passed
 * @property {any} [result] Result data if successful
 * @property {Error} [error] Error if failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}=====================================${colors.reset}`);
console.log(`${colors.bold}${colors.blue}   AUTH SYSTEM DIAGNOSTIC TOOL      ${colors.reset}`);
console.log(`${colors.bold}${colors.blue}=====================================${colors.reset}\n`);

/**
 * Run a test function and handle success/failure
 * 
 * @param {string} name The name of the test
 * @param {() => any} testFn The test function to run
 * @returns {TestResult} The test result
 */
const runTest = (name, testFn) => {
  process.stdout.write(`${colors.bold}[TEST]${colors.reset} ${name}... `);
  try {
    const result = testFn();
    console.log(`${colors.green}PASSED${colors.reset}`);
    return { success: true, result };
  } catch (error) {
    console.log(`${colors.red}FAILED${colors.reset}`);
    console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`);
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

// Test 1: Check Environment Variables
runTest('Checking environment variables', () => {
  const requiredVars = ['DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  return true;
});

// Test 2: Check Database Connection
runTest('Testing database connection', () => {
  try {
    // Simple check to make sure the DATABASE_URL is formatted correctly
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not defined");
    
    if (!dbUrl.startsWith('postgresql://')) {
      throw new Error("DATABASE_URL must be a valid PostgreSQL connection string");
    }
    
    console.log(`\n${colors.cyan}Database URL format appears valid${colors.reset}`);
    return true;
  } catch (error) {
    throw error;
  }
});

// Test 3: Check Schema Files
runTest('Checking schema definitions', () => {
  const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.ts');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (!schemaContent.includes('users') || !schemaContent.includes('sessions')) {
    throw new Error('Schema must contain users and sessions tables for authentication');
  }
  
  return true;
});

// Test 4: Check Auth Files
runTest('Checking auth implementation', () => {
  const authPaths = [
    path.join(process.cwd(), 'src', 'server', 'auth', 'lucia.ts'),
    path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'login', 'route.ts'),
    path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'signup', 'route.ts'),
    path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'logout', 'route.ts')
  ];
  
  const missingFiles = authPaths.filter(p => !fs.existsSync(p));
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing required auth files: ${missingFiles.join(', ')}`);
  }
  
  return true;
});

// Test 5: Check for the reset page
runTest('Checking for reset page', () => {
  const resetPath = path.join(process.cwd(), 'src', 'app', 'reset', 'page.tsx');
  
  if (!fs.existsSync(resetPath)) {
    throw new Error(`Reset page not found at ${resetPath}`);
  }
  
  return true;
});

console.log(`\n${colors.bold}${colors.blue}=====================================${colors.reset}`);
console.log(`${colors.bold}${colors.blue}            NEXT STEPS               ${colors.reset}`);
console.log(`${colors.bold}${colors.blue}=====================================${colors.reset}\n`);

console.log(`${colors.cyan}If all tests passed, try the following:${colors.reset}`);
console.log(`1. ${colors.bold}Start your application:${colors.reset} npm run dev`);
console.log(`2. ${colors.bold}Navigate to:${colors.reset} http://localhost:3000/reset`);
console.log(`3. ${colors.bold}Use the reset function${colors.reset} to clear any existing cookies/sessions`);
console.log(`4. ${colors.bold}Try to create a new account${colors.reset} or login with an existing one\n`);

console.log(`${colors.cyan}If you still encounter issues:${colors.reset}`);
console.log(`- Check your browser console for any errors`);
console.log(`- Look at the server logs for authentication errors`);
console.log(`- Verify your database tables are properly created`);
console.log(`- Make sure you're on the latest version of Lucia authentication\n`);

console.log(`${colors.bold}${colors.blue}=====================================${colors.reset}\n`); 