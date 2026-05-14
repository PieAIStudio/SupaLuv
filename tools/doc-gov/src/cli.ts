import { runApprove } from './commands/approve';
import { runArchive } from './commands/archive';
import { runAudit } from './commands/audit';
import { runCheck } from './commands/check';
import { runFind } from './commands/find';
import { runInit } from './commands/init';
import { runLinks } from './commands/links';
import { runList } from './commands/list';
import { runNew } from './commands/new';
import { runRouterCheck } from './commands/router-check';
import { runScan } from './commands/scan';
import { runSupersede } from './commands/supersede';
import { runVerifyCommitMsg } from './commands/verify-commit-msg';

const COMMANDS = [
  'check',
  'scan',
  'audit',
  'links',
  'router-check',
  'find',
  'list',
  'new',
  'approve',
  'supersede',
  'archive',
  'init',
  'verify-commit-msg',
] as const;

const [command, ...args] = process.argv.slice(2);
let exitCode = 0;

if (command === 'check') exitCode = runCheck();
else if (command === 'scan') exitCode = runScan(args);
else if (command === 'audit') exitCode = runAudit();
else if (command === 'links') exitCode = runLinks();
else if (command === 'router-check') exitCode = runRouterCheck();
else if (command === 'find') exitCode = runFind(args);
else if (command === 'list') exitCode = runList(args);
else if (command === 'new') exitCode = runNew(args);
else if (command === 'approve') exitCode = runApprove(args);
else if (command === 'supersede') exitCode = runSupersede(args);
else if (command === 'archive') exitCode = runArchive(args);
else if (command === 'init') exitCode = runInit(args);
else if (command === 'verify-commit-msg') exitCode = runVerifyCommitMsg(args);
else if (!command || command === '--help' || command === '-h') {
  printHelp();
  exitCode = command ? 0 : 1;
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  exitCode = 1;
}

process.exitCode = exitCode;

function printHelp(): void {
  console.log('doc-gov — cross-project AI-collaboration documentation governance');
  console.log('');
  console.log('Usage: pnpm doc-gov <command> [args...]');
  console.log('');
  console.log('Commands:');
  console.log('  check                       Validate frontmatter, status, canonical, integrity');
  console.log('  scan [--check]              Regenerate (or verify) docs/governance/MANIFEST.yml');
  console.log('  audit                       Advisory health report');
  console.log('  links                       Validate current-layer local Markdown links');
  console.log('  router-check                Validate router/profile/Superpowers wiring');
  console.log('  find <topic>                Search canonical docs by id/title/tag/path');
  console.log('  list [--type X] [--status Y] [--pinned]  List docs');
  console.log(
    '  new <type> <slug>           Create a doc from template (decision/spec/plan/canon/policy/reference)'
  );
  console.log('  approve <id>                draft→active (or proposed→accepted)');
  console.log('  supersede <oldId> <newId>   Mark old as superseded by new (bidirectional link)');
  console.log('  archive <id> --reason TEXT  Move doc to docs/archive/<quarter>-<type>/');
  console.log('  init [--force]              Create directory skeleton in current project');
  console.log(
    '  verify-commit-msg <file>    Hook helper: enforce Pinned-Override / Approves markers'
  );
  console.log('');
  console.log(`Available commands: ${COMMANDS.join(', ')}`);
}
