import { checkDocs } from '../core/checker';

export function runCheck(): number {
  const result = checkDocs(process.cwd());
  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.file}: ${issue.code}: ${issue.message}`);
    }
    return 1;
  }
  console.log(`doc-gov check passed (${result.records.length} docs).`);
  return 0;
}
