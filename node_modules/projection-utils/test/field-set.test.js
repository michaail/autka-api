const {ProjectionFieldSet} = require('..');

// We want to ensure that intersect and union never unintentionally return one
// of their operands: they should be pure functions.
function instanceInvariant(fn) {
  return jest.fn().mockImplementation(function(other) {
    const value = fn.call(this, other);
    expect(value).not.toBe(this);
    expect(value).not.toBe(other);
    return value;
  });
}

describe('ProjectionFieldSet', () => {
  // Set up invariant checks.
  beforeAll(() => {
    const {intersect, union} = ProjectionFieldSet.prototype;
    Object.assign(ProjectionFieldSet.prototype, {
      intersect: instanceInvariant(intersect),
      union: instanceInvariant(union),
    });
  });

  it('should generate from provided', () => {
    const fields = new ProjectionFieldSet([['users', 'id'], ['content']]);
    const allFields = [...fields];
    expect(allFields).toHaveLength(2);
    expect(allFields).toEqual(expect.arrayContaining([
      ['content'],
      ['users', 'id'],
    ]));
  });

  it('should dedupe', () => {
    const fields = new ProjectionFieldSet([['users'], ['users']]);
    expect([...fields]).toEqual([['users']]);
  });

  it('should generate from dotted', () => {
    const fields = ProjectionFieldSet.fromDotted(['users.id', 'users.email', 'content']);
    const allFields = [...fields];
    expect(allFields).toHaveLength(3);
    expect(allFields).toEqual(expect.arrayContaining([
      ['content'],
      ['users', 'email'],
      ['users', 'id'],
    ]));
  });

  it('should intersect field sets', () => {
    const permittedFields = ProjectionFieldSet.fromDotted(
      ['users.id', 'users.email', 'share', 'notifications', 'content']);

    const desiredFields = ProjectionFieldSet.fromDotted(
      ['users', 'users.accessToken', 'share', 'notifications.count', 'invalid']);

    // The fields we want, where they're permitted.
    const selectedFields = permittedFields.intersect(desiredFields);
    const allSelected = [...selectedFields];
    expect(allSelected).toHaveLength(4);
    expect(allSelected).toEqual(expect.arrayContaining([
      ['notifications', 'count'],
      ['share'],
      ['users', 'email'],
      ['users', 'id'],
    ]));
  });

  it('should union field sets', () => {
    const selectedFields = ProjectionFieldSet.fromDotted(
      ['users.id', 'users.email', 'notifications.count', 'share']);

    const mandatoryFields = ProjectionFieldSet.fromDotted(
      ['internalVersion', 'notifications.targets', 'share']);

    const queryFields = selectedFields.union(mandatoryFields);
    const allQuery = [...queryFields];
    expect(allQuery).toHaveLength(6);
    expect(allQuery).toEqual(expect.arrayContaining([
      ['internalVersion'],
      ['notifications', 'count'],
      ['notifications', 'targets'],
      ['share'],
      ['users', 'email'],
      ['users', 'id'],
    ]));
  });

  it('should produce a mongo projection', () => {
    const selectedFields = ProjectionFieldSet.fromDotted(
      ['users.id', 'users.email', 'notifications.count', 'share']);

    expect(selectedFields.toMongo()).toEqual({
      'users.id': 1,
      'users.email': 1,
      'notifications.count': 1,
      share: 1,
    });

    expect(selectedFields.toMongo(0)).toEqual({
      'users.id': 0,
      'users.email': 0,
      'notifications.count': 0,
      share: 0,
    });
  });

  it('should produce dot-joined fields', () => {
    const selectedFields = ProjectionFieldSet.fromDotted(
      ['users.id', 'users.email', 'notifications.count', 'share']);
    const dotted = [...selectedFields.toDotted()];
    expect(dotted).toHaveLength(4);
    expect(dotted).toEqual(expect.arrayContaining([
      'users.id',
      'users.email',
      'notifications.count',
      'share',
    ]));
  });

  it('should widen with the given field', () => {
    const selectedFields = ProjectionFieldSet.fromDotted(
      ['users.id', 'users.email', 'notifications.count', 'share']);
    selectedFields.widen(['notifications', 'targets', 'value']);

    expect(selectedFields.toMongo()).toEqual({
      'users.id': 1,
      'users.email': 1,
      'notifications.count': 1,
      'notifications.targets.value': 1,
      share: 1,
    });
    selectedFields.widen(['notifications', 'targets']);

    expect(selectedFields.toMongo()).toEqual({
      'users.id': 1,
      'users.email': 1,
      'notifications.count': 1,
      'notifications.targets': 1,
      share: 1,
    });
    selectedFields.widen(['notifications', 'count', 'subfield']);

    expect(selectedFields.toMongo()).toEqual({
      'users.id': 1,
      'users.email': 1,
      'notifications.count': 1,
      'notifications.targets': 1,
      share: 1,
    });

    selectedFields.widen([]);
    expect(selectedFields.toMongo()).toEqual({});

    selectedFields.widen(['notifications', 'count', 'subfield']);
    expect(selectedFields.toMongo()).toEqual({});
  });

  it('should handle operations on special sets', () => {
    const mandatoryFields = ProjectionFieldSet.fromDotted(
      ['internalVersion', 'notifications.targets', 'share']);
    const singular = new ProjectionFieldSet([[]]);
    const empty = new ProjectionFieldSet([]);

    expect(singular.union(singular)).toEqual(singular);
    expect(singular.intersect(singular)).toEqual(singular);

    expect(singular.union(mandatoryFields)).toEqual(singular);
    expect(singular.intersect(mandatoryFields)).toEqual(mandatoryFields);

    expect(empty.union(empty)).toEqual(empty);
    expect(empty.intersect(empty)).toEqual(empty);

    expect(empty.union(mandatoryFields)).toEqual(mandatoryFields);
    expect(empty.intersect(mandatoryFields)).toEqual(empty);

    expect(empty.union(singular)).toEqual(singular);
    expect(empty.intersect(singular)).toEqual(empty);
  });

  it('should determine containment', () => {
    const mandatoryFields = ProjectionFieldSet.fromDotted(
      ['internalVersion', 'notifications.targets', 'share']);
    expect(mandatoryFields.contains([])).toBe(false);
    expect(mandatoryFields.contains(['internalVersion'])).toBe(true);
    expect(mandatoryFields.contains(['notifications'])).toBe(false);
    expect(mandatoryFields.contains(['notifications', 'targets'])).toBe(true);
    expect(mandatoryFields.contains(['notifications', 'targets', 'subfield'])).toBe(true);
    expect(mandatoryFields.containsDotted('')).toBe(false);
    expect(mandatoryFields.containsDotted('internalVersion')).toBe(true);
    expect(mandatoryFields.containsDotted('notifications')).toBe(false);
    expect(mandatoryFields.containsDotted('notifications.targets')).toBe(true);
    expect(mandatoryFields.containsDotted('notifications.targets.subfield')).toBe(true);
  });

  fit('should produce contained entries', () => {
    const mandatoryFields = ProjectionFieldSet.fromDotted(
      ['internalVersion', 'notifications.targets', 'share']);
    expect([...mandatoryFields.get([])]).toEqual([...mandatoryFields.entries()]);
    expect([...mandatoryFields.get([], false)]).toEqual([...mandatoryFields.entries()]);
    expect([...mandatoryFields.getDotted('')]).toEqual([...mandatoryFields.toDotted()]);
    expect([...mandatoryFields.getDotted('', false)]).toEqual([...mandatoryFields.toDotted()]);

    expect([...mandatoryFields.get(['internalVersion'])]).toEqual([['internalVersion']]);
    expect([...mandatoryFields.get(['internalVersion'], false)]).toEqual([[]]);
    expect([...mandatoryFields.getDotted('internalVersion')]).toEqual(['internalVersion']);
    expect([...mandatoryFields.getDotted('internalVersion', false)]).toEqual(['']);
    expect([...mandatoryFields.get(['notifications'])]).toEqual([['notifications', 'targets']]);
    expect([...mandatoryFields.get(['notifications'], false)]).toEqual([['targets']]);
    expect([...mandatoryFields.getDotted('notifications')]).toEqual(['notifications.targets']);
    expect([...mandatoryFields.getDotted('notifications', false)]).toEqual(['targets']);

    expect([...mandatoryFields.get(['notifications', 'invalid'])]).toEqual([]);
    expect([...mandatoryFields.get(['notifications', 'invalid'], false)]).toEqual([]);
    expect([...mandatoryFields.getDotted('notifications.invalid')]).toEqual([]);
    expect([...mandatoryFields.getDotted('notifications.invalid', false)]).toEqual([]);
  });
});
