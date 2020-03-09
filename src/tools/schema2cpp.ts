/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, ClassGenerator, AddFieldOptions} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {ParticleSpec} from '../runtime/particle-spec.js';
import {Type} from '../runtime/type.js';
import {Refinement} from '../runtime/refiner.js';

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
  'T': {type: 'std::string', defaultVal: ' = ""',    isString: true},
  'U': {type: 'URL',         defaultVal: ' = ""',    isString: true},
  'N': {type: 'double',      defaultVal: ' = 0',     isString: false},
  'B': {type: 'bool',        defaultVal: ' = false', isString: false},
  'R': {type: '',            defaultVal: ' = {}',    isString: false},
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
#ifndef _ARCS_H
#error arcs.h must be included before entity class headers
#endif
`;
  }

  fileFooter(): string {
    return '\n#endif\n';
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new CppGenerator(node, this.scope.replace(/\./g, '::'));
  }

  generateParticleClass(particle: ParticleSpec): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];

    for (const connection of particle.connections) {
      const handleName = connection.name;

      // Recursively compute the C++ type from the given Arcs type.
      const getCppType = (type: Type, wrapEntityInSingleton: boolean = false): string => {
        if (type.isCollectionType()) {
          return `arcs::Collection<${getCppType(type.getContainedType())}>`;
        } else if (wrapEntityInSingleton) {
          return `arcs::Singleton<${getCppType(type)}>`;
        } else if (type.isReference) {
          return `arcs::Ref<${getCppType(type.getContainedType())}>`;
        } else {
          return `arcs::${particleName}_${this.upperFirst(connection.name)}`;
        }
      };
      const handleType = getCppType(connection.type, /* wrapEntityInSingleton= */ true);

      handleDecls.push(`${handleType} ${handleName}_{this, "${handleName}"};`);
    }
    return `
class Abstract${particleName} : public arcs::Particle {
protected:
  ${handleDecls.join('\n  ')}
};
`;
  }
}

class CppGenerator implements ClassGenerator {
  fields: string[] = [];
  api: string[] = [];
  ctor: string[] = [];
  clone: string[] = [];
  hash: string[] = [];
  equals: string[] = [];
  less: string[] = [];
  decode: string[] = [];
  encode: string[] = [];
  stringify: string[] = [];

  constructor(readonly node: SchemaNode, readonly namespace: string) {}

  escapeIdentifier(name: string): string {
    // TODO(cypher1): Check for complex keywords (e.g. cases where both 'final' and '_final' are keywords).
    // TODO(cypher1): Check for name overlaps (e.g. 'final' and '_final' should not be escaped to the same identifier.
    return (keywords.includes(name) ? '_' : '') + name;
  }

  addField({field, typeChar, refClassName, isOptional = false, isCollection = false}: AddFieldOptions) {
    const fixed = this.escapeIdentifier(field);
    const valid = `${field}_valid_`;
    let {type, defaultVal, isString} = typeMap[typeChar];
    if (typeChar === 'R') {
      type = `Ref<${refClassName}>`;
    }

    this.fields.push(`${type} ${field}_${defaultVal};`,
                     `bool ${valid} = false;`,
                     ``);

    if (typeChar === 'R') {
      this.api.push(`const ${type}& ${fixed}() const { return ${field}_; }`,
                    `void set_${field}(const ${refClassName}& value) { internal::Accessor::bind(&${field}_, value); }`);
    } else {
      const [r1, r2] = isString ? ['const ', '&'] : ['', ''];
      this.api.push(`${r1}${type}${r2} ${fixed}() const { return ${field}_; }`,
                    `void set_${field}(${r1}${type}${r2} value) { ${field}_ = value; ${valid} = true; }`);
    }
    if (isOptional) {
      this.api.push(`void clear_${field}() { ${field}_${defaultVal}; ${valid} = false; }`,
                    `bool has_${field}() const { return ${valid}; }`);
    }
    this.api.push(``);

    this.ctor.push(`${field}_(other.${fixed}()), ${valid}(other.has_${field}())`);

    this.clone.push(`clone.${field}_ = entity.${field}_;`,
                    `clone.${valid} = entity.${valid};`);

    this.decode.push(`} else if (name == "${field}") {`,
                     `  decoder.validate("${typeChar}");`,
                     `  decoder.decode(entity->${field}_);`,
                     `  entity->${valid} = true;`);

    if (isOptional) {
      this.equals.push(`(a.${valid} ? (b.${valid} && a.${field}_ == b.${field}_) : !b.${valid})`);

      this.less.push(`if (a.${valid} != b.${valid}) {`,
                     `  return !a.${valid};`);
    } else {
      this.equals.push(`(a.${field}_ == b.${field}_)`);

      this.less.push(`if (0) {`);
    }
    if (isString) {
      this.less.push(`} else if (int cmp = a.${field}_.compare(b.${field}_)) {`,
                     `  return cmp < 0;`,
                     `}`);
    } else {
      this.less.push(`} else if (a.${field}_ != b.${field}_) {`,
                     `  return a.${field}_ < b.${field}_;`,
                     `}`);
    }

    const ifValid = isOptional ? `if (entity.${valid}) ` : '';
    this.hash.push(`${ifValid}internal::hash_combine(h, entity.${field}_);`);
    this.encode.push(`${ifValid}encoder.encode("${field}:${typeChar}", entity.${field}_);`);

    // For convenience, don't include unset required fields in the entity_to_str output.
    this.stringify.push(`if (entity.${valid}) printer.add("${field}: ", entity.${field}_);`);
  }

  generatePredicates() {
  }

  generate(schemaHash: string, fieldCount: number): string {
    const {name, aliases} = this.node;

    // Template constructor allows implicit type slicing from appropriately matching entities.
    let templateCtor = '';
    if (this.ctor.length) {
      templateCtor = `\
  template<typename T>
  ${name}(const T& other) :
    ${this.ctor.join(',\n    ')}
  {}
  `;
    }

    // 'using' declarations for equivalent entity types.
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
class ${name} {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ${name}() = default;
  ${name}(${name}&&) = default;
  ${name}& operator=(${name}&&) = default;

${templateCtor}
  ${this.api.join('\n  ')}
  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ${name}& other) const;
  bool operator!=(const ${name}& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ${name}& a, const ${name}& b) {
    if (int cmp = a._internal_id_.compare(b._internal_id_)) {
      return cmp < 0;
    }
    ${this.less.join('\n    ')}
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ${name}(const ${name}&) = default;
  ${name}& operator=(const ${name}&) = default;

  static const char* _schema_hash() { return "${schemaHash}"; }
  static const int _field_count = ${fieldCount};

  ${this.fields.join('\n  ')}
  std::string _internal_id_;

  friend class Singleton<${name}>;
  friend class Collection<${name}>;
  friend class Ref<${name}>;
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
inline std::string internal::Accessor::entity_to_str(const ${name}& entity, const char* join, bool with_id) {
  internal::StringPrinter printer;
  if (with_id) {
    printer.addId(entity._internal_id_);
  }
  ${this.stringify.join('\n  ')}
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(${name}* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ${name}::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    ${this.decode.join('\n    ')}
    } else {
      // Ignore unknown fields until type slicing is fully implemented.
      std::string typeChar = decoder.chomp(1);
      if (typeChar == "T" || typeChar == "U") {
        std::string s;
        decoder.decode(s);
      } else if (typeChar == "N") {
        double d;
        decoder.decode(d);
      } else if (typeChar == "B") {
        bool b;
        decoder.decode(b);
      }
      i--;
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
