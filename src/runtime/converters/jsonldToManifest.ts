/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const supportedTypes = ['Text', 'URL', 'Number', 'Boolean'];

interface Class {
  superclass?: Class[];
  '@id': string;
}

export class JsonldToManifest {

  static convert(jsonld: string, theClass: Class | void = undefined) {
    const obj = JSON.parse(jsonld);
    const classes = {};
    const properties = {};

    if (!obj['@graph']) {
      obj['@graph'] = [obj];
    }

    for (const item of obj['@graph']) {
      if (item['@type'] === 'rdf:Property') {
        properties[item['@id']] = item;
      } else if (item['@type'] === 'rdfs:Class') {
        classes[item['@id']] = item;
        item['subclasses'] = [];
        item['superclass'] = null;
      }
    }

    for (const clazz of Object.values(classes)) {
      if (clazz['rdfs:subClassOf'] !== undefined) {
        if (clazz['rdfs:subClassOf'].length == undefined) {
          clazz['rdfs:subClassOf'] = [clazz['rdfs:subClassOf']];
        }
        for (const subClass of clazz['rdfs:subClassOf']) {
          const superclass = subClass['@id'];
          if (clazz['superclass'] == undefined) {
            clazz['superclass'] = [];
          }
          if (classes[superclass]) {
            classes[superclass].subclasses.push(clazz);
            clazz['superclass'].push(classes[superclass]);
          } else {
            clazz['superclass'].push({'@id': superclass});
          }
        }
      }
    }

    for (const clazz of Object.values(classes)) {
      if (clazz['subclasses'].length === 0 && theClass == undefined) {
        theClass = clazz as Class;
      }
    }

    const relevantProperties = [];
    for (const property of Object.values(properties)) {
      let domains = property['schema:domainIncludes'];
      if (!domains) {
        domains = {'@id': theClass['@id']};
      }
      if (!domains.length) {
        domains = [domains];
      }
      domains = domains.map(a => a['@id']);
      if (domains.includes(theClass['@id'])) {
        const name = property['@id'].split(':')[1];
        let type = property['schema:rangeIncludes'];
        // The property can only be used if we know the type.
        // If the type is not known, ignore the property.
        if (type) {
          if (!type.length) {
            type = [type];
          }

          type = type.map(a => a['@id'].split(':')[1]);
          type = type.filter(type => supportedTypes.includes(type));
          if (type.length > 0) {
            relevantProperties.push({name, type});
          }
        }
      }
    }

    const className = theClass['@id'].split(':')[1];
    const superNames = theClass && theClass.superclass ? theClass.superclass.map(a => a['@id'].split(':')[1]) : [];

    let s = '';
    for (const superName of superNames) {
      s += `import 'https://schema.org/${superName}'\n\n`;
    }

    s += `schema ${className}`;
    if (superNames.length > 0) {
      s += ` extends ${superNames.join(', ')}`;
    }

    if (relevantProperties.length > 0) {
      for (const property of relevantProperties) {
        let type;
        if (property.type.length > 1) {
          type = '(' + property.type.join(' or ') + ')';
        } else {
          type = property.type[0];
        }
        s += `\n  ${property.name}: ${type}`;
      }
    }
    s += '\n';

    return s;
  }
}
