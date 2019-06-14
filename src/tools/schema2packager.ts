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

const keywords = [
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case',
  'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const',
  'consteval', 'constexpr', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield',
  'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
  'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long',
  'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq',
  'private', 'protected', 'public', 'register', 'reinterpret_cast', 'requires', 'return', 'short',
  'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch', 'template',
  'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union',
  'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'
];

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

function generate(schemaName: string, schema) {
  const fields: string[] = [];
  const api: string[] = [];
  const decode: string[] = [];
  const encode: string[] = [];
  const toString: string[] = [];

  const processValue = (name, type, typeChar, passByReference) => {
    const [ref1, ref2] = passByReference ? ['const ', '&'] : ['', ''];
    const fix = keywords.includes(name) ? '_' : '';

    fields.push(`${type} ${name}_ = ${type}();`,
                `bool ${name}_valid_ = false;`,
                ``);

    api.push(`${ref1}${type}${ref2} ${fix}${name}() const { return ${name}_; }`,
             `void set_${name}(${ref1}${type}${ref2} value) { ${name}_ = value; ${name}_valid_ = true; }`,
             `void clear_${name}() { ${name}_ = ${type}(); ${name}_valid_ = false; }`,
             `bool has_${name}() const { return ${name}_valid_; }`,
             ``);

    decode.push(`} else if (name == "${name}") {`,
                `  decoder.validate("${typeChar}");`,
                `  decoder.decode(entity->${name}_);`,
                `  entity->${name}_valid_ = true;`);

    encode.push(`if (entity.has_${name}())`,
                `  encoder.encode("${name}:${typeChar}", entity.${fix}${name}());`);

    toString.push(`if (entity.has_${name}())`,
                  `  printer.add("${name}: ", entity.${fix}${name}());`);
  };

  let fieldCount = 0;
  for (const [name, field] of Object.entries(schema.fields)) {
    fieldCount++;
    switch (typeSummary(field)) {
      case 'schema-primitive:Text':
        processValue(name, 'std::string', 'T', true);
        break;

      case 'schema-primitive:URL':
        processValue(name, 'URL', 'U', true);
        break;

      case 'schema-primitive:Number':
        processValue(name, 'double', 'N', false);
        break;

      case 'schema-primitive:Boolean':
        processValue(name, 'bool', 'B', false);
        break;

      default:
        console.error(`Schema type for field '${name}' is not yet supported:`);
        console.dir(field, {depth: null});
        process.exit(1);
    }
  }

  const headerGuard = `_ARCS_ENTITY_${schemaName.toUpperCase()}_H`;
  const content = `\
#ifndef ${headerGuard}
#define ${headerGuard}

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class ${schemaName} {
public:
  ${api.join('\n  ')}
  std::string _internal_id;  // TODO

private:
  ${fields.join('\n  ')}
  static const int FIELD_COUNT = ${fieldCount};
  friend void decode_entity<${schemaName}>(${schemaName}* entity, const char* str);
};

template<>
void decode_entity(${schemaName}* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ${schemaName}::FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    ${decode.join('\n    ')}
    }
    decoder.validate("|");
  }
}

template<>
std::string encode_entity(const ${schemaName}& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id);
  ${encode.join('\n  ')}
  return std::move(encoder.result());
}

template<>
std::string entity_to_str(const ${schemaName}& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id);
  ${toString.join('\n  ')}
  return std::move(printer.result(join));
}

}  // namespace arcs

#endif
`;
  return content.replace(/ +\n/g, '\n');
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
  void processFile(file);
}
