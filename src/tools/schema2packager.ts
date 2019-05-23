/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import {Manifest} from '../runtime/manifest.js';

// TODO: options: output dir, filter specific schema(s)
const argv = minimist(process.argv.slice(2), {
  boolean: ['help'],
});

if (argv.help || argv._.length === 0) {
  console.log(`
Usage
  $ tools/sigh schema2packager [file ...]

Description
  Generates C++ code from Schemas for use in wasm particles.
`);
  process.exit();
}

// Work in progress; this generates a very simple class definition with encode/decode methods
// that rely on the code defined in src/wasm/arcs.h. This will be updated in time to have a
// more proto-like API. Note that when encoding to string from the C++ side, zero/empty fields
// are considered undefined so there's currently no way to indicate a present-but-zero value.

function typeSummary(field) {
  switch (field.kind) {
    case 'schema-primitive':
      return `schema-primitive:${field.type}`;

    case 'schema-collection':
      return `schema-collection:${field.schema.type}`;

    default:
      return field.kind;
  }
}

function generate(schemaName, schema) {
  const decl = [];
  const encode = [];
  const decode = [];

  const processValue = (name, type, typeChar, condition, initial) => {
    decl.push(`${type} ${name}${initial};`);

    encode.push(`if (${condition})`,
                `  encoder.encodeValue("${name}:${typeChar}", ${name}, "|");`);

    decode.push(`} else if (name == "${name}") {`,
                `  decoder.validate("${typeChar}");`,
                `  decoder.decodeValue(obj.${name});`);
  };

  const processCollection = (name, type, typeChar) => {
    decl.push(`std::unordered_set<${type}> ${name};`);

    encode.push(`if (!${name}.empty())`,
                `  encoder.encodeCollection("${name}:C${typeChar}", ${name});`);

    decode.push(`} else if (name == "${name}") {`,
                `  decoder.validate("C${typeChar}");`,
                `  decoder.decodeCollection(obj.${name});`);
  };

  let fieldCount = 0;
  for (const [name, field] of Object.entries(schema.fields)) {
    fieldCount++;
    switch (typeSummary(field)) {
      case 'schema-primitive:Text':
        processValue(name, 'std::string', 'T', `!${name}.empty()`, '');
        break;

      case 'schema-primitive:URL':
        processValue(name, 'URL', 'U', `!${name}.href.empty()`, '');
        break;

      case 'schema-primitive:Number':
        processValue(name, 'double', 'N', `${name} != 0`, ' = 0');
        break;

      case 'schema-primitive:Boolean':
        processValue(name, 'bool', 'B', name, ' = false');
        break;

      case 'schema-collection:Text':
        processCollection(name, 'std::string', 'T');
        break;

      case 'schema-collection:URL':
        processCollection(name, 'URL, HashURL, EqualURL', 'U');
        break;

      case 'schema-collection:Number':
        processCollection(name, 'double', 'N');
        break;

      case 'schema-collection:Boolean':
        processCollection(name, 'bool', 'B');
        break;

      default:
        console.error(`Schema type for field '${name}' is not yet supported:`);
        console.dir(field, {depth: null});
        process.exit(1);
    }
  }
  const headerGuard = `_ARCS_ENTITY_${schemaName.toUpperCase()}_H`;
  return `\
#ifndef ${headerGuard}
#define ${headerGuard}
// GENERATED CODE

namespace arcs {

class ${schemaName} {
public:
  ${decl.join('\n  ')}

  static const int FIELD_COUNT = ${fieldCount};

  std::string encode() {
    internal::StringEncoder encoder;
    ${encode.join('\n    ')}
    return encoder.result();
  }

  static ${schemaName} decode(std::string str) {
    ${schemaName} obj;
    internal::StringDecoder decoder(str.c_str());
    for (int i = 0; !decoder.done() && i < FIELD_COUNT; i++) {
      std::string name = decoder.upTo(':');
      if (0) {
      ${decode.join('\n      ')}
      }
      decoder.validate("|");
    }
    return obj;
  }
};

}

#endif
`;
}

// TODO: handle schemas with multiple names and schemas with parents
// TODO: error handling
async function processFile(file) {
  const contents = fs.readFileSync(file, 'utf-8');
  const manifest = await Manifest.parse(contents);
  for (const schema of Object.values(manifest.schemas)) {
    const outFile = 'entity-' + schema.names[0].toLowerCase() + '.h';
    const contents = generate(schema.names[0], schema);
    fs.writeFileSync(outFile, contents);
  }
}

for (const file of argv._) {
  processFile(file);
}
