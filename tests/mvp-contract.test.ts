import { describe, expect, it } from 'vitest';
import { sitePages } from '../../../网站/app/content/pages';
import {
  buildContentTree,
  getAncestors,
  getChildren,
  getSiblings,
  validatePages,
} from '../src/lib/content-tree';

describe('MVP page contract', () => {
  it('contains 29 valid and unique routes', () => {
    expect(sitePages).toHaveLength(29);
    expect(validatePages(sitePages)).toEqual([]);
    expect(new Set(sitePages.map((page) => page.path)).size).toBe(29);
  });

  it('derives children, siblings, and ancestors from one tree', () => {
    const tree = buildContentTree(sitePages);
    const teaching = tree.byPath.get('/solutions/industries/k12/teaching');

    expect(getChildren(tree, '/solutions/common')).toHaveLength(8);
    expect(getSiblings(tree, teaching!)).toHaveLength(6);
    expect(getAncestors(tree, teaching!).map((page) => page.path)).toEqual([
      '/solutions/industries',
      '/solutions/industries/k12',
    ]);
  });

  it('reports missing parents and parent cycles', () => {
    const broken = [
      { path: '/a', template: 'detail' as const, parentPath: '/b' },
      { path: '/b', template: 'detail' as const, parentPath: '/a' },
      { path: '/c', template: 'brand' as const, parentPath: '/missing' },
    ];

    expect(validatePages(broken)).toEqual([
      'Parent cycle detected: /a -> /b -> /a',
      'Missing parent for /c: /missing',
    ]);
  });
});
