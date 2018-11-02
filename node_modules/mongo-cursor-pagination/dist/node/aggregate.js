function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const _ = require('underscore');
const sanitizeParams = require('./utils/sanitizeParams');
const { prepareResponse, generateSort, generateCursorQuery } = require('./utils/query');

/**
 * Performs an aggregate() query on a passed-in Mongo collection, using criteria you specify.
 * Unlike `find()`, this method requires fine tuning by the user, and must comply with the following
 * two criteria so that the pagination magic can work properly.
 *
 * 1. `aggregate()` will insert a `$sort` and `$limit` clauses in your aggregation pipeline immediately after
 * the first $match is found. Consider this while building your pipeline.
 *
 * 2. The documents resulting from the aggregation _must_ contain the paginated fields so that a
 * cursor can be built from the result set.
 *
 * Additionally, an additional query will be appended to the first `$match` found in order to apply the offset
 * required for the cursor.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    or the mongoist package's `db.collection(<collectionName>)` method.
 * @param {Object} params
 *    -aggregation {Object[]} The aggregation query.
 *    -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
 *    -paginatedField {String} The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 *    -next {String} The value to start querying the page.
 *    -previous {String} The value to start querying previous page.
 *    -after {String} The _id to start querying the page.
 *    -before {String} The _id to start querying previous page.
 */
module.exports = (() => {
  var _ref = _asyncToGenerator(function* (collection, params) {
    params = _.defaults((yield sanitizeParams(collection, params)), { aggregation: [] });
    let cursorQuery = generateCursorQuery(params);
    let $sort = generateSort(params);

    let index = _.findIndex(params.aggregation, function (step) {
      return !_.isEmpty(step.$match);
    });

    if (index < 0) {
      params.aggregation.unshift({ $match: cursorQuery });
      index = 0;
    } else {
      const matchStep = params.aggregation[index];

      params.aggregation[index] = {
        $match: {
          $and: [cursorQuery, matchStep.$match]
        }
      };
    }

    params.aggregation.splice(index + 1, 0, { $sort });
    params.aggregation.splice(index + 2, 0, { $limit: params.limit + 1 });

    // Support both the native 'mongodb' driver and 'mongoist'. See:
    // https://www.npmjs.com/package/mongoist#cursor-operations
    const aggregateMethod = collection.aggregateAsCursor ? 'aggregateAsCursor' : 'aggregate';

    let results = yield collection[aggregateMethod](params.aggregation).toArray();

    return prepareResponse(results, params);
  });

  function aggregate(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return aggregate;
})();