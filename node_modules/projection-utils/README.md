projection-utils
================

A set of utilities for working with MongoDB-style projections.

Notably, this project exposes a `ProjectionFieldSet` class that tracks, merges,
and intersects multi-level projections.

We do not support symmetric or asymmetric diffing of field sets, as the
semantics are not well-defined on mongo projections. A field set that contains
`users` minus a field set that contains `users.accessToken` would need new
syntax to represent the fields under `users` that aren't `accessToken`, or would
need knowledge of all existant fields under the `users` subdocument. It's better
to handle this yourself, using `intersect`, and a whitelist of permitted fields.

### `ProjectionFieldSet`

Basic usage:

```js
const permittedFields = ProjectionFieldSet.fromDotted(
  ['users.id', 'users.email', 'share', 'content']);

const desiredFields = ProjectionFieldSet.fromDotted(
  ['users', 'users.accessToken', 'share', 'invalid']);

// The fields we want, where they're permitted.
const selectedFields = permittedFields.intersect(desiredFields);

// Add fields that we need for server-side business logic.
const mandatoryFields = ProjectionFieldSet.fromDotted(
  ['internalVersion']);

const queryFields = selectedFields.union(mandatoryFields);
const projection = queryFields.toMongo();
// => {'users.id': 1, 'users.email': 1, share: 1, internalVersion: 1}
```

Constructor usage:

```js
// Equivalent to the first fromDotted invocation in the previous example.
const permittedFields = new ProjectionFieldSet([
  ['users', 'id'],
  ['users', 'email'],
  ['share'],
  ['content'],
]);
```

Iterate over paths:

```js
for (const path of permittedFields) {
  // path is the array containing the parts of the path, e.g.:
  // ['users', 'email']
}

// Or just convert to an Array:
const fields = Array.from(permittedFields);
```

Enumerate dot-joined paths:

```js
const dotJoined = Array.from(queryFields.toDotted());
// => ['users.id', 'users.email', 'share', 'internalVersion']
```

Check for field containment, and partial field containment:

```js
queryFields.contains(['users']);
// => false, because only some of the fields in users are included

// equivalent to the above
queryFields.containsDotted('users');

// produces the set of fields that are included under the users field
Array.from(queryFields.get(['users']));
// => [['users', 'id'], ['users', 'email']]

Array.from(queryFields.getDotted('users'));
// => ['users.id', 'users.email']

// both produce no items
Array.from(queryFields.get(['invalid']));
Array.from(queryFields.getDotted('invalid'));
// => []

// exclude the users prefix
Array.from(queryFields.get('users', false));
// => [['id'], ['email']]

Array.from(queryFields.getDotted('users', false));
// => ['id', 'email']
```

Explicitly expand the set of fields:

```js
// Add users.name to queryFields. Unlike intersect and union, this mutates the
// ProjectionFieldSet instead of making a new instance.
queryFields.widen(['users', 'name']);
queryFields.toMongo();
// => {'users.id': 1, 'users.email': 1, 'users.name': 1, share: 1, internalVersion: 1}

// Expand queryFields to include all fields of users (even accessToken - take
// care when ordering operations on ProjectionFieldSets, as an intersect won't
// forbid a set of fields being added to the produced ProjectionFieldSet.
queryFields.widen(['users']);
queryFields.toMongo();
// => {users: 1, share: 1, internalVersion: 1}
```

Note that field sets can be singular. Unioning with a singular value yields a
singular value, and intersecting with a singular value yields the non-singular
value. For example:

```js
// This is distinct from new ProjectionFieldSet([]) (and
// new ProjectionFieldSet()), which yield an empty fieldset, rather than a
// singular fieldset.
const singular = new ProjectionFieldSet([[]]);

singular.union(singular);
// => copy of singular

singular.intersect(singular);
// => copy of singular

singular.union(mandatoryFields);
// => copy of singular

singular.intersect(mandatoryFields);
// => copy of mandatoryFields

const empty = new ProjectionFieldSet([]);

empty.union(empty);
// => copy of empty

empty.intersect(empty);
// => copy of empty

empty.union(mandatoryFields);
// => copy of mandatoryFields

empty.intersect(mandatoryFields);
// => copy of empty


singular.union(empty);
// => copy of singular

singular.intersect(empty);
// => copy of empty
```
