// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * There are some entity shapes that aren't yet supported by Arcs. Ensure that:
 *  - There is a 'name' field.
 */
function filter(entities) {
  return Object.entries(entities).reduce((accumulator, [key, values]) => {
    accumulator[key] = values.reduce((accumulator, value) => {
      if (value.hasOwnProperty('name')) {
        accumulator.push(value);
      }
      return accumulator;
    }, []);
    return accumulator;
  }, new Object());
}

/**
 * Reduce the deeply nested structure of url=>entities-of-many-types to a
 * flatter, combined form of type=>entities.
 *
 * For example, the input would be of the form
 * {'http://g.co': [{@type: 'typeA', 'a': 1}},
 * the output would be
 * {typeA: [{@type: 'typeA', 'a': 1}]}.
 */
function flatten(entities) {
  return Object.entries(entities).reduce((accumulator, [key, value]) => {
    value.forEach(entry => {
      let type = entry['@type'];

      // normalize all https? urls to http in keys
      if (type.match(/^https?:\/\//)) {
        type = type.replace(/^https?:/, 'http:');
      }

      accumulator[type]
        ? accumulator[type].push(entry)
        : (accumulator[type] = [entry]);
    });
    return accumulator;
  }, new Object());
}

/** Returns true iff a & b are pointers to the same object, or if their naive
 * JSON representations (without sorting) are the same. {a, b} != {b, a}.
 */
function _deepIsEqual(a, b) {
  return a === b || JSON.stringify(a) == JSON.stringify(b);
}

/**
 * Removes duplicate entries. Expects the input to match the output format of
 * #flatten().
 */
function deduplicate(entities) {
  return Object.entries(entities).reduce((accumulator, [key, values]) => {
    accumulator[key] = values.reduce((accumulator, value) => {
      let isIncluded = accumulator.reduce(
        (a, av) => _deepIsEqual(av, value) || a,
        false
      );
      isIncluded || accumulator.push(value);
      return accumulator;
    }, []);
    return accumulator;
  }, new Object());
}
