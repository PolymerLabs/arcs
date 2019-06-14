/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {JsonldToManifest, supportedTypes} from '../converters/jsonldToManifest.js';
import {Predicate} from '../hot.js';
import {Manifest} from '../manifest.js';
import fs from 'fs';
import {promisify} from 'util';

describe('JsonldToManifest', () => {

  async function isValidManifest(manifestStr: string): Promise<boolean> {
    try {
      await Manifest.parse(manifestStr);
      return true;
    } catch (error) {
      return false;
    }
  }

  const getSchema = async (schema: string = 'Product'): Promise<string> => {
    const readFileAsync = promisify(fs.readFile);
    return readFileAsync(`src/runtime/test/assets/${schema}.jsonld`, {encoding: 'utf8'});
  };

  const messyOmit = (obj: object, p: Predicate<[string, unknown]>): void => {
    Object.entries(obj).forEach((kv) => {
      const key = kv[0];

      if (p(kv)) {
        delete obj[key];
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        messyOmit(obj[key], p);
      }
    });

  };

  const omitKey = (obj: object, key: string) => messyOmit(obj, (kv) => kv[0] === key);

  describe('convert', () => {
    it('works on objects without @graph', async () => {
      const schema = await getSchema();
      const valids = JSON.parse(schema)['@graph'];
      
      for (const obj of valids) {
        const str = JSON.stringify(obj);
        const manifest = JsonldToManifest.convert(str, {'@id': 'schema:Thing'});
        assert.isTrue(await isValidManifest(manifest));
      }
    });

    it('should work on a real schema.org json linked-data file', async () => {
      //TODO(alxr): Parameterize these tests to work on a variety of schemas.
      const schema = await getSchema();
      const converted = JsonldToManifest.convert(schema, {'@id': 'schema:Thing'});
      assert.isTrue(await isValidManifest(converted));
    });

    it('should add schema.org imports given superclasses', async () => {
      const schema = await getSchema('LocalBusiness');
      const converted = JsonldToManifest.convert(schema, {
        '@id': 'schema:LocalBusiness',
        superclass: [{'@id': 'schema:Place'}]
      });

      assert.match(converted, /(import\s'https:\/\/schema.org\/.+'\s+)+/g, 'manifest should contain (multiple) import statements from schema.org');
      assert.include(converted, ' extends ', 'manifest should extend at least one superclass.');
    });

    it('should produce a manifest even if the schema contains no domains', async () => {
      const schema = await getSchema('LocalBusiness');

      const json = JSON.parse(schema);
      omitKey(json, 'schema:domainIncludes');

      const testSchema = JSON.stringify(json);
      const converted =  JsonldToManifest.convert(testSchema, {'@id': 'schema:LocalBusiness'});

      assert.isTrue(await isValidManifest(converted));
    });

    // TODO(alxr) get test to pass
    it.skip('should produce a manifest even if there are no relevant properties', async () => {
      const omitSupportedRangeIncludes = (obj: object, target: string) => messyOmit(obj, (kv: [string, unknown]) => {
        const key = kv[0];

        if (key !== 'schema:rangeIncludes') {
          return false;
        }

        const val = kv[1] as object;
        return val['@id'] === target;
      });

      const schema = await getSchema('LocalBusiness');
      const json = JSON.parse(schema);

      supportedTypes.forEach((type: string) => {
        omitSupportedRangeIncludes(json, `schema:${type}`);
      });

      const data = JSON.stringify(json);

      const converted = JsonldToManifest.convert(data, {'@id': 'schema:LocalBusiness'});

      assert.isTrue(await isValidManifest(converted));
    });
  });
});
