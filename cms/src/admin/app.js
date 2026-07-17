const googleTranslatePatchMarker = Symbol.for(
  'guangtai.strapi.google-translate-dom-workaround',
);

/**
 * Installs the React-recommended DOM guards for nodes moved by Google Translate.
 *
 * @param {typeof Node | undefined} NodeConstructor - Browser Node constructor;
 *   injectable so the translated-node behavior can be verified without a browser.
 * @returns {void} This function patches the constructor prototype once and does
 *   not return a value.
 * @throws {TypeError} Propagates only if a supplied constructor exposes invalid
 *   non-callable DOM methods; the browser Node implementation is supported.
 */
export const installGoogleTranslateDomWorkaround = (
  NodeConstructor = globalThis.Node,
) => {
  if (typeof NodeConstructor !== 'function' || !NodeConstructor.prototype) {
    return;
  }

  const nodePrototype = NodeConstructor.prototype;
  if (nodePrototype[googleTranslatePatchMarker]) {
    return;
  }

  const originalRemoveChild = nodePrototype.removeChild;
  const originalInsertBefore = nodePrototype.insertBefore;

  /**
   * Removes a child unless an external translator already moved it elsewhere.
   *
   * @param {Node} child - Child node React expects to remove.
   * @returns {Node} The removed node, or the unchanged node when its parent was
   *   already replaced by an external translator.
   * @throws {DOMException} Propagates native DOM errors for otherwise valid
   *   parent-child relationships.
   */
  nodePrototype.removeChild = function removeChild(child) {
    if (child.parentNode !== this) {
      if (NodeConstructor === globalThis.Node && globalThis.console) {
        console.error(
          'Skipped removeChild because an external translator moved the node.',
          child,
          this,
        );
      }
      return child;
    }

    return originalRemoveChild.call(this, child);
  };

  /**
   * Inserts a node unless an external translator moved the reference node.
   *
   * @param {Node} newNode - Node React expects to insert.
   * @param {Node | null} referenceNode - Existing sibling used as the insertion
   *   anchor, or null to append.
   * @returns {Node} The inserted node, or the unchanged node when its reference
   *   anchor was already replaced by an external translator.
   * @throws {DOMException} Propagates native DOM errors for otherwise valid
   *   parent-child relationships.
   */
  nodePrototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (NodeConstructor === globalThis.Node && globalThis.console) {
        console.error(
          'Skipped insertBefore because an external translator moved the reference node.',
          referenceNode,
          this,
        );
      }
      return newNode;
    }

    return originalInsertBefore.call(this, newNode, referenceNode);
  };

  Object.defineProperty(nodePrototype, googleTranslatePatchMarker, {
    value: true,
  });
};

installGoogleTranslateDomWorkaround();

export default {
  config: {
    locales: ['zh-Hans'],
  },
};
