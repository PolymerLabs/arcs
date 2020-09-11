/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, EntityGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {ParticleSpec} from '../runtime/arcs-types/particle-spec.js';
import {Type} from '../types/lib-types.js';
import {Dictionary} from '../utils/lib-utils.js';

// TODO(cypher1): Generate refinements and predicates for cpp
// https://github.com/PolymerLabs/arcs/issues/4884

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

function escapeIdentifier(name: string): string {
  // TODO(cypher1): Check for complex keywords (e.g. cases where both 'final' and '_final' are keywords).
  // TODO(cypher1): Check for name overlaps (e.g. 'final' and '_final' should not be escaped to the same identifier.
  return (keywords.includes(name) ? '_' : '') + name;
}

export interface CppTypeInfo {
  type: string;
  defaultVal: string;
  isString: boolean;
}

const typeMap: Dictionary<CppTypeInfo> = {
'Text': {type: 'std::string', defaultVal: ' = ""',    isString: true},
'URL': {type: 'URL',          defaultVal: ' = ""',    isString: true},
'Number': {type: 'double',    defaultVal: ' = 0',     isString: false},
'BigInt': {type: 'long long', defaultVal: ' = 0',     isString: false},
'Boolean': {type: 'bool',     defaultVal: ' = false', isString: false},
'Reference': {type: '',       defaultVal: ' = {}',    isString: false},
};

function getTypeInfo(name: string): CppTypeInfo {
  const info = typeMap[name];
  if (!info) {
    throw new Error(`Unhandled type '${name}' for cpp.`);
  }
  return info;
}

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

  getEntityGenerator(node: SchemaNode): EntityGenerator {
    return new CppGenerator(node, this.namespace.replace(/\./g, '::'));
  }

  async generateParticleClass(particle: ParticleSpec): Promise<string> {
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

  async generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): Promise<string> {
    throw new Error('Test Harness generation is not available for CPP');
  }
}

type AddFieldOptions = Readonly<{
  field: string;
  typeName: string;
  isOptional?: boolean;
  refClassName?: string;
  refSchemaHash?: string;
  listTypeInfo?: {name: string, refSchemaHash?: string, isInlineClass?: boolean};
  isCollection?: boolean;
  isInlineClass?: boolean;
}>;

class CppEntityDescriptor {

  constructor(readonly node: SchemaNode) {
    for (const [field, descriptor] of Object.entries(this.node.schema.fields)) {
      // TODO(b/162033274): factor this into schema-field
      if (descriptor.isPrimitive) {
        if (['Text', 'URL', 'Number', 'BigInt', 'Boolean'].includes(descriptor.getType())) {
          this.addField({field, typeName: descriptor.getType()});
        } else {
          throw new Error(`Schema type '${descriptor.getType()}' for field '${field}' is not supported`);
        }
      } else if (descriptor.isReference || (descriptor.isCollection && descriptor.getFieldType().isReference)) {
        const schemaNode = this.node.refs.get(field);
        this.addField({
          field,
          typeName: 'Reference',
          isCollection: descriptor.isCollection,
          refClassName: schemaNode.entityClassName,
          refSchemaHash: schemaNode.hash,
        });
      } else if (descriptor.isCollection) {
        const schema = descriptor.getFieldType();
        if (schema.isPrimitive) {
          this.addField({field, typeName: schema.getType(), isCollection: true});
        } else {
          throw new Error(`Schema kind '${schema.kind}' for field '${field}' is not supported`);
        }
      }
      else {
        throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
      }
    }
  }

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

  addField({field, typeName, refClassName, isOptional = false, isCollection = false}: AddFieldOptions) {
    // Work around for schema2graph giving the Kotlin RefClassName.
    if (refClassName !== undefined) {
      refClassName = `${this.node.sources[0].fullName}_Ref`;
    }
    const fixed = escapeIdentifier(field);
    const valid = `${field}_valid_`;
    let {type, defaultVal, isString} = getTypeInfo(typeName);
    if (typeName === 'Reference') {
      type = `Ref<${refClassName}>`;
    }

    this.fields.push(`${type} ${field}_${defaultVal};`,
                     `bool ${valid} = false;`,
                     ``);

    if (typeName === 'Reference') {
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
                     `  decoder.validate("${typeName[0]}");`,
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
    this.encode.push(`${ifValid}encoder.encode("${field}:${typeName[0]}", entity.${field}_);`);

    // For convenience, don't include unset required fields in the entity_to_str output.
    this.stringify.push(`if (entity.${valid}) printer.add("${field}: ", entity.${field}_);`);
  }
}

class CppGenerator implements EntityGenerator {

  private descriptor: CppEntityDescriptor;

  constructor(readonly node: SchemaNode, readonly namespace: string) {
    this.descriptor = new CppEntityDescriptor(node);
  }

  typeFor(name: string): string {
    return getTypeInfo(name).type;
  }

  defaultValFor(name: string): string {
    return getTypeInfo(name).defaultVal;
  }

  generate(): string {
    const name = this.node.fullEntityClassName;
    const aliases = this.node.sources.map(s => s.fullName);
    // Template constructor allows implicit type slicing from appropriately matching entities.
    let templateCtor = '';
    if (this.descriptor.ctor.length) {
      templateCtor = `\
  template<typename T>
  ${name}(const T& other) :
    ${this.descriptor.ctor.join(',\n    ')}
  {}
  `;
    }

    // 'using' declarations for equivalent entity types.
    let aliasComment = '';
    let usingDecls = '';
    if (aliases.length > 1) {
      aliasComment = `\n// Aliased as ${aliases.join(', ')}`;
      usingDecls = '\n' + aliases.map(a => `using ${a} = ${name};`).join('\n') + '\n';
    }

    // Schemas with no fields will always be equal.
    if (this.descriptor.fields.length === 0) {
      this.descriptor.equals.push('true');
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
  ${this.descriptor.api.join('\n  ')}
  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ${name}& other) const;
  bool operator!=(const ${name}& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ${name}& a, const ${name}& b) {
    if (int cmp = a._internal_id_.compare(b._internal_id_)) {
      return cmp < 0;
    }
    ${this.descriptor.less.join('\n    ')}
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ${name}(const ${name}&) = default;
  ${name}& operator=(const ${name}&) = default;

  static const char* _schema_hash() { return "${this.node.hash}"; }
  static const int _field_count = ${Object.entries(this.descriptor.node.schema.fields).length};

  ${this.descriptor.fields.join('\n  ')}
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
  ${this.descriptor.clone.join('\n  ')}
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ${name}& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  ${this.descriptor.hash.join('\n  ')}
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ${name}& a, const ${name}& b) {
  return ${this.descriptor.equals.join(' && \n         ')};
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
  ${this.descriptor.stringify.join('\n  ')}
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
    ${this.descriptor.decode.join('\n    ')}
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
  ${this.descriptor.encode.join('\n  ')}
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
