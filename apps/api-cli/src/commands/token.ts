import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from '../api-client.js';

export function createTokenCommand(apiClient: ApiClient): Command {
  const command = new Command('token')
    .description('Manage authentication token');

  command
    .command('show')
    .description('Show the current authentication token')
    .action(async () => {
      try {
        const hasToken = await apiClient.loadToken();
        if (!hasToken) {
          console.log(chalk.yellow('No token found'));
          console.log(chalk.gray('Run: api-cli login -e <email> -p <password>'));
          return;
        }

        const token = apiClient.getToken();
        console.log(chalk.green('✓ Token found'));
        console.log(chalk.gray('Token:'), token);
      } catch (error) {
        console.error(chalk.red('✗ Failed to read token'));
        process.exit(1);
      }
    });

  command
    .command('clear')
    .description('Clear the saved authentication token')
    .action(async () => {
      try {
        await apiClient.clearToken();
        console.log(chalk.green('✓ Token cleared'));
      } catch (error) {
        console.error(chalk.red('✗ Failed to clear token'));
        process.exit(1);
      }
    });

  return command;
}
