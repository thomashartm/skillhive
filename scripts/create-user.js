#!/usr/bin/env node

/**
 * Script to create a user in the TrainHive database
 * Usage: node scripts/create-user.js <email> <password> <role> [name]
 * Example: node scripts/create-user.js admin@example.com admin123 ADMIN "Admin User"
 */

const bcrypt = require('bcryptjs');
const { createConnection } = require('typeorm');

// Valid user roles
const VALID_ROLES = ['USER', 'PROFESSOR', 'MANAGER', 'ADMIN'];

async function createUser(email, password, role, name) {
  // Validate inputs
  if (!email || !password || !role) {
    console.error('Error: Email, password, and role are required');
    console.log('Usage: node scripts/create-user.js <email> <password> <role> [name]');
    console.log('Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  // Validate role
  const upperRole = role.toUpperCase();
  if (!VALID_ROLES.includes(upperRole)) {
    console.error(`Error: Invalid role "${role}"`);
    console.log('Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`Error: Invalid email format "${email}"`);
    process.exit(1);
  }

  // Validate password length
  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long');
    process.exit(1);
  }

  // Default name if not provided
  const userName = name || email.split('@')[0];

  let connection;

  try {
    console.log('Connecting to database...');

    // Create database connection
    connection = await createConnection({
      type: 'mysql',
      url: process.env.DATABASE_URL || 'mysql://trainhive_user:trainhive_password@localhost:3306/trainhive',
      entities: [],
      synchronize: false,
    });

    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await connection.query(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      console.error(`Error: User with email "${email}" already exists (ID: ${existingUser[0].id})`);
      process.exit(1);
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    console.log('Creating user...');
    const result = await connection.query(
      'INSERT INTO users (email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [email, hashedPassword, userName, upperRole]
    );

    const userId = result.insertId;

    console.log('\n✓ User created successfully!');
    console.log('─────────────────────────────');
    console.log('ID:      ', userId);
    console.log('Email:   ', email);
    console.log('Name:    ', userName);
    console.log('Role:    ', upperRole);
    console.log('─────────────────────────────\n');
    console.log('You can now login with:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\nTest the login:');
    console.log(`  curl -X POST 'http://localhost:3001/api/v1/auth/login' \\`);
    console.log(`    -H 'Content-Type: application/json' \\`);
    console.log(`    -d '{"email":"${email}","password":"${password}"}'`);
    console.log('');

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    if (connection && connection.isConnected) {
      await connection.close();
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const [email, password, role, name] = args;

// Run the script
createUser(email, password, role, name);
