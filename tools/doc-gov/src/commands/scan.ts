import { manifestInSync, writeManifest } from '../core/manifest';

export function runScan(args: string[]): number {
  const checkOnly = args.includes('--check');
  if (checkOnly) {
    if (!manifestInSync(process.cwd())) {
      console.error('docs/governance/MANIFEST.yml is out of sync. Run: pnpm doc-gov scan');
      return 1;
    }
    console.log('doc-gov scan --check passed.');
    return 0;
  }
  writeManifest(process.cwd());
  console.log('docs/governance/MANIFEST.yml regenerated.');
  return 0;
}
