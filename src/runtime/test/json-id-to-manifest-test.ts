/** @see LICENSE */

import {assert} from '../../platform/chai-web.js';
import {JsonldToManifest} from '../converters/jsonldToManifest.js';
import {fetch} from '../../platform/fetch-web.js';
import {Predicate} from '../hot.js';
import {Manifest} from '../manifest.js';

describe('JsonldToManifest', () => {

  const isValidManifest: Predicate<string> = (manifestStr: string): boolean => {
    try {
      Manifest.parse(manifestStr);
    } catch (error) {
      return false;
    }
    return true;
  };

  const asyncProductStr: Promise<string> = fetch('https://schema.org/Product.jsonld')
    .then(r => r.text());

  const asyncLocalBusinessStr: Promise<string> = fetch('https://schema.org/LocalBusiness.jsonld')
    .then(r => r.text());

  describe('convert', () => {
    it('works on objects without @graph', async () => {
      const valids = await asyncProductStr
        .then((s: string) => JSON.parse(s))
        .then((j: JSON) => j['@graph']);

      valids.map(obj => JSON.stringify(obj))
        .map((s: string) => JsonldToManifest.convert(s, {'@id': 'schema:Thing'}))
        .forEach((manifest: string) => {
          assert.isTrue(isValidManifest(manifest));
        });
    });

    it('should work on a real schema.org json linked-data file', () => {
      asyncProductStr
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
        return manifest.indexOf(' extends ') !== -1;
      };

      asyncLocalBusinessStr
        .then((data: string) => JsonldToManifest.convert(data, {'@id': 'schema:LocalBusiness', superclass: [{'@id': 'schema:Place'}]}))
        .then((converted: string)=> {
          assert.isTrue(containsSchemaOrgImportStatements(converted), 'manifest should contain (multiple) import statements from schema.org');
          assert.isTrue(classExtendsSuperclasses(converted), 'manifest should extend at least one superclass.');
        });
    });

  });
});
