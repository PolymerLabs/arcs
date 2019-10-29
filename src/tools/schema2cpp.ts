/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, ClassGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';

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

const typeMap = {
  'T': {type: () => 'std::string',    returnByRef: true,  setByRef: true,  useCompare: true},
  'U': {type: () => 'URL',            returnByRef: true,  setByRef: true,  useCompare: true},
  'N': {type: () => 'double',         returnByRef: false, setByRef: false, useCompare: false},
  'B': {type: () => 'bool',           returnByRef: false, setByRef: false, useCompare: false},
  'R': {type: name => `Ref<${name}>`, returnByRef: false, setByRef: true,  useCompare: false},
};

export class Schema2Cpp extends Schema2Base {
  // test-CPP.file_Name.arcs -> test-cpp-file-name.h
  outputName(baseName: string): string {
    return baseName.toLowerCase().replace(/\.arcs$/, '').replace(/[._]/g, '-') + '.h';
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

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new CppGenerator(node, this.scope.replace('.', '::'));
  }
}

class CppGenerator implements ClassGenerator {
  fields: string[] = [];
  api: string[] = [];
  clone: string[] = [];
  hash: string[] = [];
  equals: string[] = [];
  less: string[] = [];
  decode: string[] = [];
  encode: string[] = [];
  toString: string[] = [];

  constructor(readonly node: SchemaNode, readonly namespace: string) {}

  processField(field: string, typeChar: string, inherited: boolean, refName: string) {
    const typeInfo = typeMap[typeChar];
    const type = typeInfo.type(refName);
    const [r1, r2] = typeInfo.returnByRef ? ['const ', '&'] : ['', ''];
    const [s1, s2] = typeInfo.setByRef ? ['const ', '&'] : ['', ''];
    const fixed = (keywords.includes(field) ? '_' : '') + field;
    const valid = `${field}_valid_`;

    // Fields inherited from a base class don't need member declarations or API methods in this one.
    if (!inherited) {
      this.fields.push(`${type} ${field}_ = ${type}();`,
                       `bool ${valid} = false;`,
                       ``);

      this.api.push(`${r1}${type}${r2} ${fixed}() const { return ${field}_; }`,
                    `void set_${field}(${s1}${type}${s2} value) { ${field}_ = value; ${valid} = true; }`,
                    `void clear_${field}() { ${field}_ = ${type}(); ${valid} = false; }`,
                    `bool has_${field}() const { return ${valid}; }`,
                    ``);
    }

    this.clone.push(`clone.${field}_ = entity.${field}_;`,
                    `clone.${valid} = entity.${valid};`);

    this.hash.push(`if (entity.${valid})`,
                   `  internal::hash_combine(h, entity.${field}_);`);

    this.equals.push(`(a.${valid} ? (b.${valid} && a.${field}_ == b.${field}_) : !b.${valid})`);

    this.less.push(`if (a.${valid} != b.${valid}) {`,
                   `  return !a.${valid};`);
    if (typeInfo.useCompare) {
      this.less.push(`} else {`,
                     `  cmp = a.${field}_.compare(b.${field}_);`,
                     `  if (cmp != 0) return cmp < 0;`,
                     `}`);
    } else {
      this.less.push(`} else if (a.${field}_ != b.${field}_) {`,
                     `  return a.${field}_ < b.${field}_;`,
                     `}`);
    }

    this.decode.push(`} else if (name == "${field}") {`,
                     `  decoder.validate("${typeChar}");`,
                     `  decoder.decode(entity->${field}_);`,
                     `  entity->${valid} = true;`);

    this.encode.push(`if (entity.${valid})`,
                     `  encoder.encode("${field}:${typeChar}", entity.${field}_);`);

    this.toString.push(`if (entity.${valid})`,
                       `  printer.add("${field}: ", entity.${field}_);`);
  }

  generate(fieldCount: number): string {
    const {name, aliases, parents, children, sharesParent} = this.node;

    let bases = '';
    if (parents.length) {
      // Add base classes. Use virtual inheritance if we know this schema shares a parent
      // with another schema, and it also has descendant schemas. Note this means some
      // false positives are possible, but that's not really a problem.
      const spec = (sharesParent && children.length) ? 'virtual public' : 'public';
      bases = ` : ${spec} ` + parents.map(p => p.name).join(`, ${spec} `);
    } else {
      // This class doesn't have any parents so it needs an id field (which
      // will subsequently be inherited by any children of this class).
      this.fields.push('std::string _internal_id_;');
    }

    // Use a virtual destructor for all schemas that participate in inheritance chains.
    let dtor = '';
    if (parents.length || children.length) {
      dtor = `virtual ~${name}() {}\n`;
    }

    let aliasComment = '';
    let usingDecls = '';
    if (aliases.length) {
      aliasComment = `\n// Aliased as ${aliases.join(', ')}`;
      usingDecls = '\n' + aliases.map(a => `using ${a} = ${name};`).join('\n') + '\n';
    }

    // Schemas with no fields will always be equal.
    if (fieldCount === 0) {
      this.equals.push('true');
    }

    return `\

namespace ${this.namespace} {
${aliasComment}
class ${name}${bases} {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ${name}() = default;
  ${name}(${name}&&) = default;
  ${name}& operator=(${name}&&) = default;
  ${dtor}
  ${this.api.join('\n  ')}
  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ${name}& other) const;
  bool operator!=(const ${name}& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ${name}& a, const ${name}& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    ${this.less.join('\n    ')};
    return false;
  }

protected:
  // Ref<T> instances require a Handle pointer; entity classes can ignore it.
  ${name}(Handle* handle) {}

  // Allow private copying for use in Handles.
  ${name}(const ${name}&) = default;
  ${name}& operator=(const ${name}&) = default;

  ${this.fields.join('\n  ')}
  static const int _FIELD_COUNT = ${fieldCount};

  friend class Singleton<${name}>;
  friend class Collection<${name}>;
  friend class internal::Accessor;
};
${usingDecls}
template<>
inline ${name} internal::Accessor::clone_entity(const ${name}& entity) {
  ${name} clone;
  ${this.clone.join('\n  ')}
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ${name}& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  ${this.hash.join('\n  ')}
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ${name}& a, const ${name}& b) {
  return ${this.equals.join(' && \n         ')};
}

inline bool ${name}::operator==(const ${name}& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ${name}& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  ${this.toString.join('\n  ')}
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(${name}* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ${name}::_FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    ${this.decode.join('\n    ')}
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ${name}& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  ${this.encode.join('\n  ')}
  return encoder.result();
}

}  // namespace ${this.namespace}

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::${name}> {
  size_t operator()(const arcs::${name}& entity) const {
    return arcs::hash_entity(entity);
  }
};
`;
  }
}
