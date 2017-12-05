// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * Transform the results from our internal format (list of
 *   [{tab: tabInfo, results: [entities]}]
 * into the format expect by callers, namely a map
 *   {url: [entities]}
 * Also trims out any empty results (urls without entities, for instance).
 */
function _prepareResults(results) {
  return results.reduce((accumulator, currentValue) => {
    let value = currentValue['result'];
    if (value) {
      let key = currentValue['tab']['url'];
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}
