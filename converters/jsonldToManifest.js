/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var supportedTypes = ["Text", "URL"];

class JsonldToManifest {
  static convert(jsonld) {
    var obj = JSON.parse(jsonld);
    var classes = {};
    var properties = {};
    for (var item of obj['@graph']) {
      if (item["@type"] == "rdf:Property")
        properties[item["@id"]] = item;
      else if (item["@type"] == "rdfs:Class") {
        classes[item["@id"]] = item;
        item.subclasses = [];
        item.superclass = null;
      }
    }
    for (var clazz of Object.values(classes)) {
      if (clazz['rdfs:subClassOf'] !== undefined) {
        var superclass = clazz['rdfs:subClassOf']['@id'];
        classes[superclass].subclasses.push(clazz);
        clazz.superclass = classes[superclass];
      }
    }
    var theClass = null;
    for (var clazz of Object.values(classes)) {
      if (clazz.subclasses.length == 0) {
        theClass = clazz;
      }
    }

    var relevantProperties = [];
    for (var property of Object.values(properties)) {
      var domains = property['schema:domainIncludes'];
      if (!domains.length)
        domains = [domains];
      domains = domains.map(a => a['@id']);
      if (domains.includes(theClass['@id'])) {
        var name = property['@id'].split(':')[1];
        var type = property['schema:rangeIncludes'];
        if (!type.length)
          type = [type];

        type = type.map(a => a['@id'].split(':')[1]);
        type = type.filter(type => supportedTypes.includes(type));
        if (type.length > 0)
        relevantProperties.push({name, type});
      }
    }

    var className = theClass['@id'].split(':')[1];
    var superName = theClass.superclass ? theClass.superclass['@id'].split(':')[1] : null;

    var s = '';
    if (superName !== null)
      s += `import 'https://schema.org/${superName}'\n\n`

    s += `schema ${className}`
    if (superName !== null)
      s += ` extends ${superName}`

    if (relevantProperties.length > 0) {
      s += '\n  optional';
      for (var property of relevantProperties) {
        if (property.type.length > 1)
          var type = '(' + property.type.join(" or ") + ')';
        else
          var type = property.type[0]
        s += `\n    ${type} ${property.name}`;
      }
    }
    s += '\n';

    return s;
  }
}

module.exports = JsonldToManifest;

var fs = require('fs');
console.log(JsonldToManifest.convert(fs.readFileSync("C:/Users/shanestephens/Downloads/Product.jsonld", "utf-8")));
