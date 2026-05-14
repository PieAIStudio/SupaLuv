import { checkDocs } from '../core/checker';

export function runFind(args: string[]): number {
  const query = args.join(' ').trim().toLowerCase();
  if (!query) {
    console.error('Usage: pnpm doc-gov find <topic>');
    return 1;
  }
  const result = checkDocs(process.cwd());
  if (!result.ok) {
    console.error('doc-gov check currently fails; fix docs before relying on find.');
    return 1;
  }
  const matches = result.records.filter((record) => {
    const haystack = [
      record.id,
      record.title,
      record.type,
      record.status,
      record.domain,
      record.tags.join(' '),
      record.path,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
  if (matches.length === 0) {
    console.log(`No docs found for: ${query}`);
    return 0;
  }
  for (const record of matches) {
    console.log(`${record.id}\t${record.type}\t${record.status}\t${record.path}\t${record.title}`);
  }
  return 0;
}
