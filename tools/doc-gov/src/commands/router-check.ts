import { checkRouterIntegrity } from '../core/router-integrity';

export function runRouterCheck(): number {
  const result = checkRouterIntegrity(process.cwd());
  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.file}: ${issue.code}: ${issue.message}`);
    }
    return 1;
  }
  console.log('doc-gov router-check passed.');
  return 0;
}
