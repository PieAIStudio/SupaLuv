import { checkCurrentMarkdownLinks } from '../core/link-checker';

export function runLinks(): number {
  const result = checkCurrentMarkdownLinks(process.cwd());

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(issue.message);
    }
    return 1;
  }

  console.log(
    `doc-gov links passed (${result.checkedFiles} current files, ${result.checkedLinks} local links).`
  );
  return 0;
}
