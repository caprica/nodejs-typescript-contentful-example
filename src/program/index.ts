/*
 * Command-line module.
 */
import { Command } from 'commander'
import { setupCommand } from './setup-command'
import { teardownCommand } from './teardown-command'

const DEFAULT_TAG = 'generated'
const DEFAULT_LOCALE = 'en-US'

const program = new Command()

program
    .name('cfdata')
    .description('Manage Contentful test data')
    .version('0.0.1')

program.command('teardown')
    .description('Remove all previously generated test data')
    .option('-t, --tag', 'id of the pre-existing tag to use to find items to delete', DEFAULT_TAG)
    .action(teardownCommand)

program.command('setup')
    .description('Add new generated test data')
    .option('-l, --locale', 'locale to generate test data for', DEFAULT_LOCALE)
    .option('-t, --tag', 'id of the pre-existing tag to use when creating items', DEFAULT_TAG)
    .action(setupCommand)

program.parse()
