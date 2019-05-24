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

  describe('convert', () => {

    it('works on objects without @graph', () => {
      const valids = [
        {
          '@id': 'schema:itemShipped',
          'schema:rangeIncludes': {
            '@id': 'schema:Product'
          }
        },
        {
          '@id': 'schema:isSimilarTo',
          '@type': 'rdf:Property',
          'dcterms:source': {
            '@id': 'http://www.w3.org/wiki/WebSchemas/SchemaDotOrgSources#source_GoodRelationsTerms'
          },
          'rdfs:comment': 'A pointer to another, functionally similar product (or multiple products).',
          'rdfs:label': 'isSimilarTo',
          'schema:domainIncludes': [
            {
              '@id': 'schema:Service'
            },
            {
              '@id': 'schema:Product'
            }
          ],
          'schema:rangeIncludes': [
            {
              '@id': 'schema:Product'
            },
            {
              '@id': 'schema:Service'
            }
          ]
        },
        {
          '@id': 'schema:url',
          '@type': 'rdf:Property',
          'rdfs:comment': 'URL of the item.',
          'rdfs:label': 'url',
          'schema:domainIncludes': {
            '@id': 'schema:Thing'
          },
          'schema:rangeIncludes': {
            '@id': 'schema:URL'
          }
        },
      ];

      valids.map(obj => JSON.stringify(obj))
        .map(s => JsonldToManifest.convert(s, {'@id': 'schema:Thing'}))
        .forEach(manifest => {
          assert.isTrue(isValidManifest(manifest));
        });
    });

    it('should work on a real schema.org json linked-data file', () => {
      fetch('https://schema.org/Product.jsonld')
        .then(r => r.text())
        .then(d => JsonldToManifest.convert(d, {'@id': 'schema:Thing'}))
        .then(converted => {
          assert.isTrue(isValidManifest(converted));
        });

    });

  });
});
