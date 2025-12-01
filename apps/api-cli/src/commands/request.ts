import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from '../api-client.js';

export function createRequestCommand(apiClient: ApiClient): Command {
  const command = new Command('request')
    .description('Make an authenticated request to any API endpoint')
    .argument('<method>', 'HTTP method (GET, POST, PUT, PATCH, DELETE)')
    .argument('<path>', 'API path (e.g., /api/v1/videos)')
    .option('-d, --data <json>', 'Request body as JSON string')
    .option('-q, --query <params>', 'Query parameters as JSON string')
    .action(async (method: string, path: string, options) => {
      try {
        // Load token
        const hasToken = await apiClient.loadToken();
        if (!hasToken) {
          console.error(chalk.red('✗ No authentication token found'));
          console.error(chalk.yellow('Please run: api-cli login -e <email> -p <password>'));
          process.exit(1);
        }

        console.log(chalk.blue(`Making ${method.toUpperCase()} request to ${path}...`));

        // Parse data and query params
        const data = options.data ? JSON.parse(options.data) : undefined;
        const params = options.query ? JSON.parse(options.query) : undefined;

        let result;
        const normalizedMethod = method.toUpperCase();

        switch (normalizedMethod) {
          case 'GET':
            result = await apiClient.get(path, { params });
            break;
          case 'POST':
            result = await apiClient.post(path, data, { params });
            break;
          case 'PUT':
            result = await apiClient.put(path, data, { params });
            break;
          case 'PATCH':
            result = await apiClient.patch(path, data, { params });
            break;
          case 'DELETE':
            result = await apiClient.delete(path, { params });
            break;
          default:
            console.error(chalk.red(`✗ Unsupported HTTP method: ${method}`));
            process.exit(1);
        }

        console.log(chalk.green('✓ Request successful'));
        console.log(chalk.gray('Response:'));
        console.log(JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error(chalk.red('✗ Request failed'));
        process.exit(1);
      }
    });

  return command;
}
