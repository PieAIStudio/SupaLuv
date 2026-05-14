import { checkDocs } from '../core/checker';

export function runList(args: string[]): number {
  const type = readFlag(args, '--type');
  const status = readFlag(args, '--status');
  const pinnedOnly = args.includes('--pinned');

  const result = checkDocs(process.cwd());
  if (!result.ok) {
    console.error('doc-gov check currently fails; run `pnpm doc-gov check` to see issues.');
    return 1;
  }

  let records = result.records;
  if (type) records = records.filter((r) => r.type === type);
  if (status) records = records.filter((r) => r.status === status);
  if (pinnedOnly) records = records.filter((r) => r.pinned);

  if (records.length === 0) {
    console.log('No matching docs.');
    return 0;
  }

  // Header
  console.log('ID\tTYPE\tSTATUS\tCANONICAL\tPINNED\tPATH\tTITLE');
  for (const r of records) {
    console.log(
      `${r.id}\t${r.type}\t${r.status}\t${r.canonical}\t${r.pinned}\t${r.path}\t${r.title}`
    );
  }
  console.log(`\n${records.length} doc(s).`);
  return 0;
}

function readFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
