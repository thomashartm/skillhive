#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import * as readline from 'readline';
import { AppDataSource, User } from '../packages/db/src';
import { getScopesForRole } from '../packages/shared/src';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Get all users
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
      select: ['id', 'email', 'name', 'role'],
      order: { id: 'ASC' },
    });

    if (users.length === 0) {
      console.log('No users found in database. Please run: make db-seed');
      process.exit(1);
    }

    // Display users
    console.log('\n=== Available Users ===\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role}`);
    });
    console.log('');

    // Get user selection (from CLI arg or interactive prompt)
    let selection: number;
    const cliArg = process.argv[2];

    if (cliArg) {
      // User number provided as command-line argument
      selection = parseInt(cliArg, 10);
      if (isNaN(selection) || selection < 1 || selection > users.length) {
        console.log('Invalid user number. Use: make token [user_number]');
        rl.close();
        await AppDataSource.destroy();
        process.exit(1);
      }
    } else {
      // Interactive prompt
      let answer: string;
      try {
        answer = await question('Select user number (or press Ctrl+C to cancel): ');
      } catch (error) {
        console.log('\nCancelled');
        rl.close();
        await AppDataSource.destroy();
        process.exit(0);
      }
      selection = parseInt(answer, 10);
    }

    if (isNaN(selection) || selection < 1 || selection > users.length) {
      console.log('Invalid selection');
      rl.close();
      await AppDataSource.destroy();
      process.exit(1);
    }

    const selectedUser = users[selection - 1];

    // Generate JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('Error: NEXTAUTH_SECRET environment variable is not set');
      process.exit(1);
    }

    const payload = {
      id: selectedUser.id.toString(),
      email: selectedUser.email,
      name: selectedUser.name,
      role: selectedUser.role,
      scopes: getScopesForRole(selectedUser.role),
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, secret, {
      expiresIn: '7d',
    });

    // Display token
    console.log('\n=== Bearer Token Generated ===\n');
    console.log('User:', selectedUser.email);
    console.log('Role:', selectedUser.role);
    console.log('\nBearer Token:');
    console.log(token);
    console.log('\n=== Usage ===\n');
    console.log('Copy the token above and use it in your API requests:');
    console.log('curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/...');
    console.log('\nOr with the CLI tool:');
    console.log('1. Save token to file: echo "<token>" > ~/.trainhive-token');
    console.log('2. Use CLI: npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos');
    console.log('');

    rl.close();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
