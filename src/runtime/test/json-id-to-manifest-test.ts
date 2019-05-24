/** @see LICENSE */

import {assert} from '../../platform/chai-web.js';
import {JsonldToManifest} from '../converters/jsonldToManifest.js';
import {fetch} from '../../platform/fetch-web.js';

describe('JsonldToManifest', () => {

  describe('convert', () => {

    it('works with the happy path', () => {
    fetch('https://schema.org/Product.jsonld')
      .then(r => r.text())
      .then(d => JsonldToManifest.convert(d))
      .then(converted => {
        assert.equal(converted, '');
      });

    });

  });

  function buildJsonLdStr(): string {
    const json = {};


    return JSON.stringify(json);
  }
});
