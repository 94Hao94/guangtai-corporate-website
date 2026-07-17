import { describe, expect, it } from 'vitest';

class TestNode {
  parentNode: TestNode | null = null;
  removedChildren: TestNode[] = [];
  insertedChildren: TestNode[] = [];

  removeChild(child: TestNode) {
    if (child.parentNode !== this) {
      throw new DOMException(
        'The node to be removed is not a child of this node.',
        'NotFoundError',
      );
    }

    child.parentNode = null;
    this.removedChildren.push(child);
    return child;
  }

  insertBefore(newNode: TestNode, referenceNode: TestNode | null) {
    if (referenceNode && referenceNode.parentNode !== this) {
      throw new DOMException(
        'The reference node is not a child of this node.',
        'NotFoundError',
      );
    }

    newNode.parentNode = this;
    this.insertedChildren.push(newNode);
    return newNode;
  }
}

describe('Strapi Admin DOM mutation compatibility', () => {
  it('ignores a removeChild call after a translator moved the child node', async () => {
    const adminModule = await import('../cms/src/admin/app.js');

    expect(adminModule.installGoogleTranslateDomWorkaround).toBeTypeOf(
      'function',
    );

    adminModule.installGoogleTranslateDomWorkaround(TestNode);

    const originalParent = new TestNode();
    const translatedParent = new TestNode();
    const movedChild = new TestNode();
    movedChild.parentNode = translatedParent;

    expect(originalParent.removeChild(movedChild)).toBe(movedChild);
    expect(originalParent.removedChildren).toEqual([]);
  });

  it('ignores an insertBefore call after a translator moved the reference node', async () => {
    const adminModule = await import('../cms/src/admin/app.js');

    adminModule.installGoogleTranslateDomWorkaround(TestNode);

    const originalParent = new TestNode();
    const translatedParent = new TestNode();
    const referenceNode = new TestNode();
    const newNode = new TestNode();
    referenceNode.parentNode = translatedParent;

    expect(originalParent.insertBefore(newNode, referenceNode)).toBe(newNode);
    expect(originalParent.insertedChildren).toEqual([]);
  });
});
