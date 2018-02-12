/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * These utilities can be loaded into a running web page to help automate
 * selenium testing of arcs.
 */

const debug = false;

/**
 * Traverse the list of query selectors. After each selector, both the shadow
 * & light DOM trees will be traversed.
 *
 * Note that to traverse the shadow dom, the selector directly above the
 * branch to the shadow root must be specified (or the logic here won't be
 * able to traverse that path).
 *
 * This will return all results from all branches that match the given
 * selectors.
 */
function pierceShadows(querySelectors) {
  return _pierceShadows(document, querySelectors);
}

/** As #pierceShadows, but asserts that only a single result is found. */
function pierceShadowsSingle(querySelectors) {
  const result = _pierceShadows(document, querySelectors);
  if (result.length > 1) {
    throw Error(`too many results found ${result}`);
  }
  return result[0];
}

function _nodelistToArray(nl) {
  if (!nl) return [];
  let l = nl.length,
    r = new Array(l);
  while (l--) {
    r[l] = nl[l];
  }
  return r;
}

function _pierceShadows(node, querySelectors, depth) {
  if (undefined === depth) depth = 0;

  const remainingSelectors = querySelectors.slice(1);
  const nextNodes = node.querySelectorAll(querySelectors[0]);

  if (0 == remainingSelectors.length) {
    if (debug) {
      console.log(
        `${Array(depth + 1).join(' ')}end of recursion at ${nextNodes}`
      );
    }
    return nextNodes;
  }

  const results = _nodelistToArray(nextNodes).reduce(
    (accumulator, currentValue) => {
      if (debug) {
        console.log(
          `${Array(depth + 1).join(
            ' '
          )}descending to light ${currentValue} with selector ${
            remainingSelectors[0]
          }`
        );
      }
      const lightNodes = _pierceShadows(
        currentValue,
        remainingSelectors,
        depth + 1
      );

      let shadowNodes;
      if (currentValue && currentValue.shadowRoot) {
        if (debug) {
          console.log(
            `${Array(depth + 1).join(' ')}descending to shadow ${
              currentValue.shadowRoot
            } with selector ${remainingSelectors[0]}`
          );
        }
        shadowNodes = _pierceShadows(
          currentValue.shadowRoot,
          remainingSelectors,
          depth + 1
        );
      }
      if (debug) {
        console.log(
          `${Array(depth + 1).join(
            ' '
          )}returning light ${lightNodes} and shadow ${shadowNodes}`
        );
      }

      return accumulator
        .concat(_nodelistToArray(lightNodes))
        .concat(_nodelistToArray(shadowNodes));
    },
    []
  );
  return results;
}
