export type PageTemplate = 'overview' | 'detail' | 'brand';

export interface PageNode {
  path: string;
  template: PageTemplate;
  parentPath?: string;
}

export interface ContentTree<T extends PageNode> {
  pages: readonly T[];
  byPath: ReadonlyMap<string, T>;
}

const templates = new Set<PageTemplate>(['overview', 'detail', 'brand']);

function canonicalCycle(paths: string[]): string {
  const cycle = paths.slice(0, -1);
  const rotations = cycle.map((_, index) => [
    ...cycle.slice(index),
    ...cycle.slice(0, index),
  ]);
  rotations.sort((a, b) => a.join('\0').localeCompare(b.join('\0')));
  const canonical = rotations[0];
  return [...canonical, canonical[0]].join(' -> ');
}

export function validatePages(pages: readonly PageNode[]): string[] {
  const errors: string[] = [];
  const byPath = new Map<string, PageNode>();

  for (const page of pages) {
    if (byPath.has(page.path)) errors.push(`Duplicate path: ${page.path}`);
    byPath.set(page.path, page);
    if (!templates.has(page.template)) {
      errors.push(`Unsupported template for ${page.path}: ${page.template}`);
    }
  }

  const cycles = new Set<string>();
  for (const page of pages) {
    const chain: string[] = [];
    const positions = new Map<string, number>();
    let current: PageNode | undefined = page;

    while (current) {
      const position = positions.get(current.path);
      if (position !== undefined) {
        cycles.add(canonicalCycle([...chain.slice(position), current.path]));
        break;
      }
      positions.set(current.path, chain.length);
      chain.push(current.path);
      current = current.parentPath ? byPath.get(current.parentPath) : undefined;
    }
  }
  for (const cycle of [...cycles].sort()) {
    errors.push(`Parent cycle detected: ${cycle}`);
  }

  for (const page of pages) {
    if (page.parentPath && !byPath.has(page.parentPath)) {
      errors.push(`Missing parent for ${page.path}: ${page.parentPath}`);
    }
  }

  return errors;
}

export function buildContentTree<T extends PageNode>(
  pages: readonly T[],
): ContentTree<T> {
  const errors = validatePages(pages);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return { pages, byPath: new Map(pages.map((page) => [page.path, page])) };
}

export function getChildren<T extends PageNode>(
  tree: ContentTree<T>,
  path: string,
): T[] {
  return tree.pages.filter((page) => page.parentPath === path);
}

export function getSiblings<T extends PageNode>(
  tree: ContentTree<T>,
  page: T,
): T[] {
  if (!page.parentPath) return [];
  return getChildren(tree, page.parentPath).filter(
    (candidate) => candidate.path !== page.path,
  );
}

export function getAncestors<T extends PageNode>(
  tree: ContentTree<T>,
  page: T,
): T[] {
  const ancestors: T[] = [];
  let parentPath = page.parentPath;
  while (parentPath) {
    const parent = tree.byPath.get(parentPath);
    if (!parent) break;
    ancestors.unshift(parent);
    parentPath = parent.parentPath;
  }
  return ancestors;
}
