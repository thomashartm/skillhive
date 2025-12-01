import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from '../api-client.js';

export function createVideosCommand(apiClient: ApiClient): Command {
  const command = new Command('videos')
    .description('Manage and query videos');

  command
    .command('list')
    .description('List all videos')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .option('-o, --offset <number>', 'Offset for pagination', '0')
    .action(async (options) => {
      try {
        await apiClient.loadToken();
        const result = await apiClient.get('/api/v1/videos', {
          params: {
            limit: parseInt(options.limit),
            offset: parseInt(options.offset),
          },
        });

        console.log(chalk.green('✓ Videos retrieved'));
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(chalk.red('✗ Failed to retrieve videos'));
        process.exit(1);
      }
    });

  command
    .command('get')
    .description('Get a specific video by ID')
    .argument('<id>', 'Video ID')
    .action(async (id: string) => {
      try {
        await apiClient.loadToken();
        const result = await apiClient.get(`/api/v1/videos/${id}`);

        console.log(chalk.green('✓ Video retrieved'));
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(chalk.red('✗ Failed to retrieve video'));
        process.exit(1);
      }
    });

  command
    .command('create')
    .description('Create a new video')
    .requiredOption('-t, --title <title>', 'Video title')
    .requiredOption('-u, --url <url>', 'Video URL')
    .option('-d, --description <description>', 'Video description')
    .option('--discipline <discipline>', 'Discipline slug', 'bjj')
    .action(async (options) => {
      try {
        await apiClient.loadToken();
        const result = await apiClient.post('/api/v1/videos', {
          title: options.title,
          url: options.url,
          description: options.description,
          disciplineSlug: options.discipline,
        });

        console.log(chalk.green('✓ Video created'));
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(chalk.red('✗ Failed to create video'));
        process.exit(1);
      }
    });

  return command;
}
