import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from '../api-client.js';

export function createLoginCommand(apiClient: ApiClient): Command {
  const command = new Command('login')
    .description('Login to the API and save authentication token')
    .requiredOption('-e, --email <email>', 'User email address')
    .requiredOption('-p, --password <password>', 'User password')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Logging in...'));

        const result = await apiClient.login({
          email: options.email,
          password: options.password,
        });

        console.log(chalk.green('✓ Login successful!'));
        console.log(chalk.gray('User:'), result.user.name);
        console.log(chalk.gray('Email:'), result.user.email);
        console.log(chalk.gray('Role:'), result.user.role);
        console.log(chalk.gray('Token saved to:'), '~/.trainhive-token');
      } catch (error: any) {
        console.error(chalk.red('✗ Login failed'));
        if (error.response?.status === 401) {
          console.error(chalk.yellow('Invalid credentials'));
        }
        process.exit(1);
      }
    });

  return command;
}
