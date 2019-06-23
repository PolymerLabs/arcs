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

function typeSummary(descriptor) {
  switch (descriptor.kind) {
    case 'schema-primitive':
      return `schema-primitive:${descriptor.type}`;

    case 'schema-collection':
      return `schema-collection:${descriptor.schema.type}`;

    default:
      return descriptor.kind;
  }
}

function generate(name: string, schema) {
  const fields: string[] = [];
  const api: string[] = [];
  const clone: string[] = [];
  const decode: string[] = [];
  const encode: string[] = [];
  const toString: string[] = [];

  const processValue = (field, type, typeChar, passByReference) => {
    const [ref1, ref2] = passByReference ? ['const ', '&'] : ['', ''];
    const fix = keywords.includes(field) ? '_' : '';

    fields.push(`${type} ${field}_ = ${type}();`,
                `bool ${field}_valid_ = false;`,
                ``);

    api.push(`${ref1}${type}${ref2} ${fix}${field}() const { return ${field}_; }`,
             `void set_${field}(${ref1}${type}${ref2} value) { ${field}_ = value; ${field}_valid_ = true; }`,
             `void clear_${field}() { ${field}_ = ${type}(); ${field}_valid_ = false; }`,
             `bool has_${field}() const { return ${field}_valid_; }`,
             ``);

    clone.push(`clone.${field}_ = entity.${field}_;`,
               `clone.${field}_valid_ = entity.${field}_valid_;`);
  
    decode.push(`} else if (name == "${field}") {`,
                `  decoder.validate("${typeChar}");`,
                `  decoder.decode(entity->${field}_);`,
                `  entity->${field}_valid_ = true;`);

    encode.push(`if (entity.has_${field}())`,
                `  encoder.encode("${field}:${typeChar}", entity.${fix}${field}());`);

    toString.push(`if (entity.has_${field}())`,
                  `  printer.add("${field}: ", entity.${fix}${field}());`);
  };

  let fieldCount = 0;
  for (const [field, descriptor] of Object.entries(schema.fields)) {
    fieldCount++;
    switch (typeSummary(descriptor)) {
      case 'schema-primitive:Text':
        processValue(field, 'std::string', 'T', true);
        break;

      case 'schema-primitive:URL':
        processValue(field, 'URL', 'U', true);
        break;

      case 'schema-primitive:Number':
        processValue(field, 'double', 'N', false);
        break;

      case 'schema-primitive:Boolean':
        processValue(field, 'bool', 'B', false);
        break;

      default:
        console.error(`Schema type for field '${field}' is not yet supported:`);
        console.dir(descriptor, {depth: null});
        process.exit(1);
    }
  }

  const headerGuard = `_ARCS_ENTITY_${name.toUpperCase()}_H`;
  const content = `\
#ifndef ${headerGuard}
#define ${headerGuard}

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class ${name} {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ${name}() = default;
  ${name}(${name}&&) = default;
  ${name}& operator=(${name}&&) = default;

  ${api.join('\n  ')}
private:
  // Allow private copying for use in Handles.
  ${name}(const ${name}&) = default;
  ${name}& operator=(const ${name}&) = default;

  ${fields.join('\n  ')}
  std::string _internal_id;
  static const int FIELD_COUNT = ${fieldCount};

  friend class Singleton<${name}>;
  friend class Collection<${name}>;
  friend ${name} clone_entity<${name}>(const ${name}& entity);
  friend void decode_entity<${name}>(${name}* entity, const char* str);
  friend std::string encode_entity<${name}>(const ${name}& entity);
  friend std::string entity_to_str<${name}>(const ${name}& entity, const char* join);
};

template<>
${name} clone_entity(const ${name}& entity) {
  ${name} clone;
  ${clone.join('\n  ')}
  return std::move(clone);
}

template<>
void decode_entity(${name}* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ${name}::FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    ${decode.join('\n    ')}
    }
    decoder.validate("|");
  }
}

template<>
std::string encode_entity(const ${name}& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id);
  ${encode.join('\n  ')}
  return std::move(encoder.result());
}

template<>
std::string entity_to_str(const ${name}& entity, const char* join) {
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
