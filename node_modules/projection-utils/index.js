function splitDot(path) {
  if (!path.length) {
    return [];
  }
  return path.split('.');
}

/**
 * A set of fields that are for a projection. This set can be intersected and
 * unioned with another set to enable simple implementation of field whitelists
 * and permanent fields.
 */
class ProjectionFieldSet {
  /**
   * Create a field set from an iterable containing array paths.
   *
   * @param {Iterable<String[]>=} fields The fields to initially include. Widens
   *   to a broader set if there are conflicts (e.g. if both ['user'] and
   *   ['user', 'email'] are specified, we include all of ['user']).
   */
  constructor(fields = []) {
    if (!fields || typeof fields !== 'object' || !(Symbol.iterator in fields)) {
      throw new TypeError('expected iterable of fields');
    }

    this._root = new Map();

    for (const path of fields || []) {
      if (!Array.isArray(path)) {
        throw new TypeError('expected iterable of field arrays');
      }

      if (!path.length) {
        this._root = true;
        break;
      }

      widen(this._root, path);
    }
  }

  /**
   * Create a ProjectionFieldSet from an iterable containing dot-separated
   * paths.
   *
   * @param {Iterable<String>=} dotFields The iterable of dot-separated path
   *   strings.
   * @returns {ProjectionFieldSet} The new projection field set.
   */
  static fromDotted(dotFields = []) {
    if (!dotFields || typeof dotFields !== 'object' || !(Symbol.iterator in dotFields)) {
      throw new TypeError('expected iterable of fields');
    }

    return new ProjectionFieldSet(toPathIterable(dotFields));
  }

  /**
   * Check whether the projection is empty.
   *
   * @returns {Boolean} Whether the projection is empty.
   */
  isEmpty() {
    return this._root !== true && !this._root.size;
  }

  /**
   * In-place widen with the given path - similar semantics to
   * ProjectionFieldSet#union except it modifies the instance instead of
   * creating a new one.
   *
   * @param {String[]} path The path to widen to.
   * @throws {TypeError} If the path is not an array of strings.
   */
  widen(path) {
    if (!Array.isArray(path)) {
      throw new TypeError('expected field array');
    }

    if (!path.length) {
      this._root = true;
      return;
    }

    if (this._root === true) {
      return;
    }

    widen(this._root, path);
  }

  /**
   * Enumerate all projection fields as arrays.
   *
   * @returns {Iterator<String[]>} The iterator that produces path entries.
   */
  entries() {
    return iterEntries(this._root, []);
  }

  /**
   * Check whether this field set includes the given path.
   *
   * @param {String[]} path The path to check.
   * @returns {Boolean} Whether the path is in the field set. If you ask for
   *   ['users', 'id'] and ['users'] is permitted, then we also return true -
   *   we check whether the field would be included in the final projection.
   */
  contains(path) {
    if (!Array.isArray(path)) {
      throw new TypeError('expected field array');
    }

    return findNode(path, this._root) === true;
  }

  /**
   * Check whether we contains the given dotted field.
   *
   * @param {String} path The dot-separated path to check.
   * @returns {Boolean} Whether the path is contained in the field set.
   */
  containsDotted(path) {
    return findNode(splitDot(path), this._root) === true;
  }

  /**
   * Get the entries under the given path.
   *
   * @param {String[]} path The path to enumerate.
   * @param {Boolean} includePrefix Whether to include the given path as a
   *   prefix to the output entries.
   * @returns {Iterator<String[]>} The fields under the given path.
   */
  *get(path, includePrefix = true) {
    if (!Array.isArray(path)) {
      throw new TypeError('expected field array');
    }

    const node = findNode(path, this._root);
    if (node) {
      yield* iterEntries(node, includePrefix ? [...path] : []);
    }
  }

  /**
   * Get the entries under the given dot-separated path. If we return an
   * iterator that contains an empty string as its only element, then we contain
   * the given path exactly.
   *
   * @param {String} path The path to enumerate.
   * @param {Boolean} includePrefix Whether to include the given path as a
   *   prefix to the output entries.
   * @returns {Iterator<String>} The dot-separated fields under the given path.
   */
  *getDotted(path, includePrefix = true) {
    const splitPath = splitDot(path), node = findNode(splitPath, this._root);
    if (node) {
      yield* toDottedIterable(iterEntries(node, includePrefix ? splitPath : []));
    }
  }

  /**
   * Find the intersection of the two projection field sets. If one field set
   * includes all of the ['user'] path, and the other includes ['user.id',
   * 'user.email'], then the resulting field set will include the only
   * ['user.id', 'user.email'] from the ['user'] path.
   *
   * @param {ProjectionFieldSet} other The other set to intersect.
   * @returns {ProjectionFieldSet}
   */
  intersect(other) {
    const fields = new ProjectionFieldSet();
    fields._root = intersection(this._root, other._root);
    return fields;
  }

  /**
   * Find the union of the two projection field sets. If one field set includes
   * all of the ['user'] path, then regardless of how specific the other field
   * set is, we will include all of ['user'] or more.
   *
   * @param {ProjectionFieldSet} other The other set to union.
   * @returns {ProjectionFieldSet}
   */
  union(other) {
    const fields = new ProjectionFieldSet();
    fields._root = union(this._root, other._root);
    return fields;
  }

  /**
   * Produce dotted paths.
   *
   * @returns {Iterator<String>} The dot-separated paths represented by the
   *   projection field set.
   */
  toDotted() {
    return toDottedIterable(this);
  }

  /**
   * Produce a mongo representation of the projection field set, with the
   * optionally provided mode. Use the mode to force blacklist behavior instead
   * of whitelist.
   *
   * @param {*} mode The mode - this will be the value of all keys in the
   *   the field set.
   * @returns {Object<String, *>} The mongo projection, defaulting to whitelist.
   */
  toMongo(mode = 1) {
    const mongoProjection = {};
    // We specify everything.
    if (this._root !== true) {
      for (const path of this.toDotted()) {
        mongoProjection[path] = mode;
      }
    }
    return mongoProjection;
  }
}

// Make ProjectionFieldSet an iterator.
ProjectionFieldSet.prototype[Symbol.iterator] = ProjectionFieldSet.prototype.entries;

/**
 * Iterate over the entries of the node and all its decendants.
 *
 * @param {Map|Boolean} node The "node" to iterate through.
 * @param {String[]} prefix The iterator prefix - this is the path to the
 *   current subtree, which we prepend to all the paths we produce. This array
 *   may be mutated during normal operation, but will be returned to its initial
 *   state when iterEntries returns.
 * @returns {Iterator<String[]>} The paths that are encapsulated within the
 *   node's subtree.
 */
function *iterEntries(node, prefix) {
  if (node === true) {
    yield [...prefix];
  } else {
    for (const [suffix, child] of node) {
      prefix.push(suffix);
      yield* iterEntries(child, prefix);
      prefix.pop();
    }
  }
}

/**
 * Widen the given node to include the given path. Modifies the rootNode to
 * accomplish this. The rootNode must be a Map, and the path must have at least
 * one element.
 *
 * @param {Map} rootNode The root node of a ProjectionFieldSet.
 * @param {String[]} path The path to widen to include.
 */
function widen(rootNode, path) {
  let node = rootNode;
  for (let index = 0; index < path.length; ++index) {
    const key = path[index];
    if (index === path.length - 1) {
      node.set(key, true);
      break;
    }
    const child = node.get(key);
    if (child instanceof Map) {
      node = child;
    } else if (child) {
      break;
    } else {
      const newChild = new Map();
      node.set(key, newChild);
      node = newChild;
    }
  }
}

/**
 * Perform a deep copy of the tree of Maps and trues.
 *
 * @param {Map|Boolean} value The value to copy.
 * @returns {Map|Boolean} The copied value.
 */
function copy(value) {
  if (value === true) {
    return true;
  }
  const newValue = new Map();
  for (const [key, item] of value) {
    newValue.set(key, copy(item));
  }
  return newValue;
}

/**
 * Intersect the keys from the two given maps. The two parameters should be Maps
 * or any object that implements keys() and has() per the Map spec.
 *
 * @param {Map} a
 * @param {Map} b
 * @returns {Iterator} The keys common between the two maps.
 */
function* intersectKeys(a, b) {
  for (const key of a.keys()) {
    if (b.has(key)) {
      yield key;
    }
  }
}

/**
 * Recursively union the two subtrees. The nodes are either true, representing
 * any value, or a Map, which specifies the values that are permitted.
 *
 * @param {Map|Boolean} a The left value to intersect.
 * @param {Map|Boolean} b The right value to intersect.
 * @returns {Boolean|Map} The unioned value.
 */
function union(a, b) {
  if (!a) {
    return copy(b);
  }

  if (!b) {
    return copy(a);
  }

  if (a === true || b === true) {
    return true;
  }

  const allKeys = new Set([...a.keys(), ...b.keys()]);
  const newValue = new Map();
  for (const key of allKeys) {
    newValue.set(key, union(a.get(key), b.get(key)));
  }
  return newValue;
}

/**
 * Find the intersection of two nodes. The nodes are either true, representing
 * any value, or a Map, which specifies the values that are permitted.
 *
 * @param {Boolean|Map} a The left value to intersect.
 * @param {Boolean|Map} b The right value to intersect.
 * @returns {Boolean|Map} The intersected value.
 */
function intersection(a, b) {
  if (a === true) {
    return copy(b);
  }

  if (b === true) {
    return copy(a);
  }

  const newValue = new Map();
  for (const key of intersectKeys(a, b)) {
    newValue.set(key, intersection(a.get(key), b.get(key)));
  }
  return newValue;
}

/**
 * Get the node at the given path, or true if the path is contained in the node
 * entirely.
 *
 * @param {String[]} path The path items.
 * @param {Boolean|Map} node The node to traverse.
 * @returns {?Boolean|Map} The node identified by the path, or null if it's not
 *   included.
 */
function findNode(path, node) {
  for (const part of path) {
    if (node === true) {
      return true;
    }

    if (!node) {
      return null;
    }

    node = node.get(part);
  }
  return node;
}

/**
 * For each string in the given iterable, produce that string split on its dots.
 *
 * @param {Iterable<String>} iterable The iterable to path.
 * @returns {Iterable<String[]>} The paths, split.
 * @throws {TypeError} If any of the items in the iterable are not strings, we
 *   throw this exception.
 */
function* toPathIterable(iterable) {
  for (const dotField of iterable) {
    if (typeof dotField !== 'string') {
      throw new TypeError('expected iterable of dot-separated string fields');
    }
    yield dotField.split('.');
  }
}

/**
 * Convert an iterable of string arrays to dot-separated strings.
 *
 * @param {Iterable<String[]>} iterable The input iterable.
 * @returns {Iterable<String>} The dot-separated iterable.
 */
function* toDottedIterable(iterable) {
  for (const field of iterable) {
    yield field.join('.');
  }
}

module.exports = {
  ProjectionFieldSet,
};
