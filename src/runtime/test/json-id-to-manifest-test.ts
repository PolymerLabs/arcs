/** @see LICENSE */

import {assert} from '../../platform/chai-web.js';
import {JsonldToManifest, supportedTypes} from '../converters/jsonldToManifest.js';
import {fetch} from '../../platform/fetch-web.js';
import {Predicate} from '../hot.js';
import {Manifest} from '../manifest.js';

describe('JsonldToManifest', () => {

  const isValidManifest = (manifestStr: string): boolean => {
    try {
      Manifest.parse(manifestStr);
    } catch (error) {
      return false;
    }
    return true;
  };

  const getSchema = (schema: string = 'Product'): Promise<string> => fetch(`https://schema.org/${schema}.jsonld`)
    .then(r => r.text());

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
      const valids = await getSchema()
        .then((s: string) => JSON.parse(s))
        .then((j: JSON) => j['@graph']);

      valids.map(obj => JSON.stringify(obj))
        .map((s: string) => JsonldToManifest.convert(s, {'@id': 'schema:Thing'}))
        .forEach((manifest: string) => {
          assert.isTrue(isValidManifest(manifest));
        });
    });

    it('should work on a real schema.org json linked-data file', () => {
      //TODO(alxr): Parameterize these tests to work on a variety of schemas.
      getSchema()
        .then((data: string) => JsonldToManifest.convert(data, {'@id': 'schema:Thing'}))
        .then((converted: string) => {
          assert.isTrue(isValidManifest(converted));
        });
    });

    it('should add schema.org imports given superclasses', () => {
      const containsSchemaOrgImportStatements: Predicate<string> = (manifest: string): boolean => {
        const instances = manifest.match(/(import\s'https:\/\/schema.org\/.+'\s+)+/g);
        return !!instances;
      };

      const classExtendsSuperclasses: Predicate<string> = (manifest: string): boolean => {
        return manifest.includes(' extends ');
      };

      getSchema('LocalBusiness')
        .then((data: string) => JsonldToManifest.convert(data, {'@id': 'schema:LocalBusiness', superclass: [{'@id': 'schema:Place'}]}))
        .then((converted: string)=> {
          assert.isTrue(containsSchemaOrgImportStatements(converted), 'manifest should contain (multiple) import statements from schema.org');
          assert.isTrue(classExtendsSuperclasses(converted), 'manifest should extend at least one superclass.');
        });
    });

    it('should produce a manifest even if the schema contains no domains', () => {
      getSchema('LocalBusiness')
        .then((data: string) => JSON.parse(data))
        .then((j: JSON) => { omitKey(j, 'schema:domainIncludes'); return JSON.stringify(j);})
        .then((data: string) => JsonldToManifest.convert(data, {'@id': 'schema:LocalBusiness'}))
        .then( (converted: string) => {
          assert.isTrue(isValidManifest(converted));
        });
    });

    // TODO(alxr) get test to pass
    xit('should produce a manifest even if there are no relevant properties', () => {
      const omitSupportedRangeIncludes = (obj: object, target: string) => messyOmit(obj, (kv: [string, unknown]) => {
        const key = kv[0];

        if (key !== 'schema:rangeIncludes') {
          return false;
        }

        const val = kv[1] as object;
        return val['@id'] === target;
      });

      getSchema('LocalBusiness')
        .then((data: string) => JSON.parse(data))
        .then((j: JSON) => {
          supportedTypes.forEach((type: string) => {
            omitSupportedRangeIncludes(j, `schema:${type}`);
          });
          return JSON.stringify(j);
        })
        .then((data: string) => JsonldToManifest.convert(data, {'@id': 'schema:LocalBusiness'}))
        .then( (converted: string) => {
          assert.isTrue(isValidManifest(converted));
        });
    });
  });
});
