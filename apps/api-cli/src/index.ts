#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { ApiClient } from './api-client.js';
import { createLoginCommand } from './commands/login.js';
import { createRequestCommand } from './commands/request.js';
import { createVideosCommand } from './commands/videos.js';
import { createTokenCommand } from './commands/token.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('api-cli')
  .description('CLI tool for testing SkillHive API endpoints')
  .version('0.1.0');

// Get API URL from environment or use default
const apiUrl = process.env.API_URL || 'http://localhost:3001';
const apiClient = new ApiClient(apiUrl);

// Register commands
program.addCommand(createLoginCommand(apiClient));
program.addCommand(createRequestCommand(apiClient));
program.addCommand(createVideosCommand(apiClient));
program.addCommand(createTokenCommand(apiClient));

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse(process.argv);
