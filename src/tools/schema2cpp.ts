/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base} from './schema2base.js';
import {Schema} from '../runtime/schema.js';

// https://en.cppreference.com/w/cpp/keyword
// [...document.getElementsByClassName('wikitable')[0].getElementsByTagName('code')].map(x => x.innerHTML);
const keywords = [
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case',
  'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const',
  'consteval', 'constexpr', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield',
  'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
  'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long',
  'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq',
  'private', 'protected', 'public', 'reflexpr', 'register', 'reinterpret_cast', 'requires',
  'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct',
  'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid',
  'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while',
  'xor', 'xor_eq'
];

// type-char to [cpp-type, pass-by-reference]
const typeMap = {
  'T': ['std::string', true],
  'U': ['URL', true],
  'N': ['double', false],
  'B': ['bool', false],
};

export class Schema2Cpp extends Schema2Base {
  // test-CPP.file_name.manifest -> test-cpp-file-name-manifest.h
  outputName(baseName: string): string {
    return baseName.toLowerCase().replace(/[._]/g, '-') + '.h';
  }

  fileHeader(outName: string): string {
    const headerGuard = `_ARCS_${outName.toUpperCase().replace(/[-.]/g, '_')}`;
    return `\
#ifndef ${headerGuard}
#define ${headerGuard}

// GENERATED CODE - DO NOT EDIT
`;
  }

  fileFooter(): string {
    return '\n#endif\n';
  }

  entityClass(name: string, schema: Schema): string {
    const fields: string[] = [];
    const api: string[] = [];
    const clone: string[] = [];
    const equals: string[] = [];
    const decode: string[] = [];
    const encode: string[] = [];
    const toString: string[] = [];

    const fieldCount = this.processSchema(schema, (field: string, typeChar: string) => {
      const type = typeMap[typeChar][0];
      const [ref1, ref2] = typeMap[typeChar][1] ? ['const ', '&'] : ['', ''];
      const fixed = (keywords.includes(field) ? '_' : '') + field;
      const valid = `${field}_valid_`;

      fields.push(`${type} ${field}_ = ${type}();`,
                  `bool ${valid} = false;`,
                  ``);

      api.push(`${ref1}${type}${ref2} ${fixed}() const { return ${field}_; }`,
               `void set_${field}(${ref1}${type}${ref2} value) { ${field}_ = value; ${valid} = true; }`,
               `void clear_${field}() { ${field}_ = ${type}(); ${valid} = false; }`,
               `bool has_${field}() const { return ${valid}; }`,
               ``);

      clone.push(`clone.${field}_ = entity.${field}_;`,
                 `clone.${valid} = entity.${valid};`);

      equals.push(`(a.has_${field}() ? (b.has_${field}() && a.${fixed}() == b.${fixed}()) : !b.has_${field}())`);

      decode.push(`} else if (name == "${field}") {`,
                  `  decoder.validate("${typeChar}");`,
                  `  decoder.decode(entity->${field}_);`,
                  `  entity->${valid} = true;`);

      encode.push(`if (entity.has_${field}())`,
                  `  encoder.encode("${field}:${typeChar}", entity.${fixed}());`);

      toString.push(`if (entity.has_${field}())`,
                    `  printer.add("${field}: ", entity.${fixed}());`);
    });

    return `\

namespace arcs {

class ${name} {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ${name}() = default;
  ${name}(${name}&&) = default;
  ${name}& operator=(${name}&&) = default;

  ${api.join('\n  ')}
  // Equality is based only on the internal id. Use arcs::entities_equal() to compare fields.
  bool operator==(const ${name}& other) const { return _internal_id_ == other._internal_id_; }
  bool operator!=(const ${name}& other) const { return _internal_id_ != other._internal_id_; }

  // For STL containers.
  friend bool operator<(const ${name}& a, const ${name}& b) { return a._internal_id_ < b._internal_id_; }

  // For testing and debugging only; do not use this value for any production purpose.
  const std::string& _internal_id() const { return _internal_id_; }

private:
  // Allow private copying for use in Handles.
  ${name}(const ${name}&) = default;
  ${name}& operator=(const ${name}&) = default;

  ${fields.join('\n  ')}
  std::string _internal_id_;
  static const int _FIELD_COUNT = ${fieldCount};

  friend class Singleton<${name}>;
  friend class Collection<${name}>;
  friend ${name} clone_entity<${name}>(const ${name}& entity);
  friend void internal::decode_entity<${name}>(${name}* entity, const char* str);
};

template<>
${name} clone_entity(const ${name}& entity) {
  ${name} clone;
  ${clone.join('\n  ')}
  return std::move(clone);
}

template<>
bool entities_equal(const ${name}& a, const ${name}& b) {
  return ${equals.join(' && \n         ')};
}

template<>
std::string entity_to_str(const ${name}& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id());
  ${toString.join('\n  ')}
  return std::move(printer.result(join));
}

template<>
void internal::decode_entity(${name}* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ${name}::_FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    ${decode.join('\n    ')}
    }
    decoder.validate("|");
  }
}

template<>
std::string internal::encode_entity(const ${name}& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id());
  ${encode.join('\n  ')}
  return std::move(encoder.result());
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::${name}> {
  size_t operator()(const arcs::${name}& entity) const {
    return std::hash<std::string>()(entity._internal_id());
  }
};
`;
  }
}
