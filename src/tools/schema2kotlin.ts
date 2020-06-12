/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {AddFieldOptions, ClassGenerator, NodeAndGenerator, Schema2Base} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {generateConnectionSpecType} from './kotlin-codegen-shared.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/particle-spec.js';
import {CollectionType, EntityType, Type, TypeVariable} from '../runtime/type.js';
import {KTExtracter} from '../runtime/refiner.js';
import {Dictionary} from '../runtime/hot.js';
import minimist from 'minimist';
import {KotlinGenerationUtils, leftPad, quote} from './kotlin-generation-utils.js';
import {assert} from '../platform/assert-web.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {Schema} from '../runtime/schema.js';

// TODO: use the type lattice to generate interfaces

// https://kotlinlang.org/docs/reference/keyword-reference.html
// [...document.getElementsByTagName('code')].map(x => x.innerHTML);
// Includes reserve words for Entity Interface
const keywords = [
  'as', 'as?', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', '!in', 'interface', 'is',
  '!is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import',
  'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion',
  'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed',
  'suspend', 'tailrec', 'vararg', 'it', 'entityId', 'creationTimestamp', 'expirationTimestamp'
];

export interface KotlinTypeInfo {
  type: string;
  decodeFn: string;
  defaultVal: string;
  schemaType: string;
}

function getTypeInfo(opts: {name: string, isCollection?: boolean, refClassName?: string, listTypeName?: string, refSchemaHash?: string}): KotlinTypeInfo {
  if (opts.name === 'List') {
    assert(opts.listTypeName, 'listTypeName must be provided for Lists');
    assert(!opts.isCollection, 'collections of Lists are not supported');
    const itemTypeInfo = getTypeInfo({name: opts.listTypeName});
    return {
      type: `List<${itemTypeInfo.type}>`,
      decodeFn: `decodeList<${itemTypeInfo.type}>()`,
      defaultVal: `listOf<${itemTypeInfo.type}>()`,
      schemaType: `FieldType.ListOf(${itemTypeInfo.schemaType})`
    };
  }

  const typeMap: Dictionary<KotlinTypeInfo> = {
    'Text': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
    'URL': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
    'Number': {type: 'Double',  decodeFn: 'decodeNum()',  defaultVal: '0.0', schemaType: 'FieldType.Number'},
    'Boolean': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false', schemaType: 'FieldType.Boolean'},
    'Byte': {type: 'Byte', decodeFn: 'decodeByte()', defaultVal: '0.toByte()', schemaType: 'FieldType.Byte'},
    'Short': {type: 'Short', decodeFn: 'decodeShort()', defaultVal: '0.toShort()', schemaType: 'FieldType.Short'},
    'Int': {type: 'Int', decodeFn: 'decodeInt()', defaultVal: '0', schemaType: 'FieldType.Int'},
    'Long': {type: 'Long', decodeFn: 'decodeLong()', defaultVal: '0L', schemaType: 'FieldType.Long'},
    'Char': {type: 'Char', decodeFn: 'decodeChar()', defaultVal: `'\u0000'`, schemaType: 'FieldType.Char'},
    'Float': {type: 'Float', decodeFn: 'decodeFloat()', defaultVal: '0.0f', schemaType: 'FieldType.Float'},
    'Double': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0', schemaType: 'FieldType.Double'},
    'Reference': {
      type: `Reference<${opts.refClassName}>`,
      decodeFn: null,
      defaultVal: 'null',
      schemaType: `FieldType.EntityRef(${quote(opts.refSchemaHash)})`,
    },
  };

  const info = typeMap[opts.name];
  if (!info) {
    throw new Error(`Unhandled type '${opts.name}' for kotlin.`);
  }
  if (opts.name === 'Reference') {
    assert(opts.refClassName, 'refClassName must be provided for References');
    assert(opts.refSchemaHash, 'refSchemaHash must be provided for References');
    if (!opts.isCollection) {
      // Singleton Reference fields are nullable.
      info.type += '?';
    }
  }
  if (opts.isCollection) {
    info.defaultVal = `emptySet<${info.type}>()`;
    info.type = `Set<${info.type}>`;
  }
  return info;
}

const ktUtils = new KotlinGenerationUtils();

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(_outName: string): string {
    const imports = [
      'import arcs.sdk.*',
    ];

    if (this.opts.test_harness) {
      imports.push(
        'import arcs.core.data.EntityType',
        'import arcs.core.data.CollectionType',
        'import arcs.core.data.ReferenceType',
        'import arcs.core.data.SingletonType',
        'import arcs.core.data.TupleType',
        'import arcs.core.entity.HandleContainerType',
        'import arcs.core.entity.HandleDataType',
        'import arcs.core.entity.HandleMode',
        'import arcs.core.entity.HandleSpec',
        'import arcs.core.entity.Tuple1',
        'import arcs.core.entity.Tuple2',
        'import arcs.core.entity.Tuple3',
        'import arcs.core.entity.Tuple4',
        'import arcs.core.entity.Tuple5',
        'import arcs.sdk.testing.*',
        'import kotlinx.coroutines.CoroutineScope',
      );
    } else if (this.opts.wasm) {
      imports.push(
        'import arcs.sdk.wasm.*',
      );
    } else {
      // Imports for jvm.
      imports.push(
        'import arcs.core.data.*',
        'import arcs.core.data.util.toReferencable',
        'import arcs.core.data.util.ReferencablePrimitive',
        'import arcs.core.entity.toPrimitiveValue',
        'import arcs.core.entity.Reference',
        'import arcs.core.entity.SchemaRegistry',
        'import arcs.core.entity.Tuple1',
        'import arcs.core.entity.Tuple2',
        'import arcs.core.entity.Tuple3',
        'import arcs.core.entity.Tuple4',
        'import arcs.core.entity.Tuple5',
      );
    }
    imports.sort();

    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.namespace}

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

${imports.join('\n')}
`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node, this.opts);
  }

  /** Returns the container type of the handle, e.g. Singleton or Collection. */
  private handleContainerType(type: Type): string {
    return type.isCollectionType() ? 'Collection' : 'Singleton';
  }

  /**
   * Returns the type of the thing stored in the handle, e.g. MyEntity,
   * Reference<MyEntity>, Tuple2<Reference<Entity1>, Reference<Entity2>>.
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   */
  private handleInnerType(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean): string {
    let type = connection.type;
    if (type.isCollection || type.isSingleton) {
      // The top level collection / singleton distinction is handled by the flavour of a handle.
      type = type.getContainedType();
    }

    function generateInnerType(type: Type): string {
      if (type.isEntity || type.isVariable) {
          const node = type.isEntity
            ? nodes.find(n => n.variableName === null && n.schema.equals(type.getEntitySchema()))
            : nodes.find(n => n.variableName.includes((type as TypeVariable).variable.name));
          return particleScope ? node.humanName(connection) : node.fullName(connection);
      } else if (type.isReference) {
        return `Reference<${generateInnerType(type.getContainedType())}>`;
      } else if (type.isTuple) {
        const innerTypes = type.getContainedTypes();
        return `Tuple${innerTypes.length}<${innerTypes.map(t => generateInnerType(t)).join(', ')}>`;
      } else {
        throw new Error(`Type '${type.tag}' not supported on code generated particle handle connections.`);
      }
    }

    return generateInnerType(type);
  }

  /** Returns one of Read, Write, ReadWrite. */
  private handleDirection(direction: Direction): string {
    switch (direction) {
      case 'reads writes':
        return 'ReadWrite';
      case 'reads':
        return 'Read';
      case 'writes':
        return 'Write';
      default:
        throw new Error(`Unsupported handle direction: ${direction}`);
    }
  }

  private handleMode(connection: HandleConnectionSpec): string {
    const direction = this.handleDirection(connection.direction);
    const querySuffix = this.getQueryType(connection) ? 'Query' : '';
    return `${direction}${querySuffix}`;
  }

  /**
   * Returns the handle interface type, e.g. WriteSingletonHandle,
   * ReadWriteCollectionHandle. Includes generic arguments.
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   */
  handleInterfaceType(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean) {
    if (connection.direction !== 'reads' && connection.direction !== 'writes' && connection.direction !== 'reads writes') {
      throw new Error(`Unsupported handle direction: ${connection.direction}`);
    }

    const containerType = this.handleContainerType(connection.type);
    if (this.opts.wasm) {
      const topLevelNodes = SchemaNode.topLevelNodes(connection, nodes);
      if (topLevelNodes.length !== 1) throw new Error('Wasm does not support handles of tuples');
      const entityType = topLevelNodes[0].humanName(connection);
      return `Wasm${containerType}Impl<${entityType}>`;
    }

    const handleMode = this.handleMode(connection);
    const innerType = this.handleInnerType(connection, nodes, particleScope);
    const typeArguments: string[] = [innerType];
    const queryType = this.getQueryType(connection);
    if (queryType) {
      typeArguments.push(queryType);
    }
    return `${handleMode}${containerType}Handle<${ktUtils.joinWithIndents(typeArguments, {startIndent: 4})}>`;
  }

  private handleSpec(handleName: string, connection: HandleConnectionSpec, nodes: SchemaNode[]): string {
    const mode = this.handleMode(connection);
    const type = generateConnectionSpecType(connection, nodes);
    // Using full names of entities, as these are aliases available outside the particle scope.
    const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.fullName(connection));
    return ktUtils.applyFun(
        'HandleSpec',
        [`"${handleName}"`, `HandleMode.${mode}`, type, ktUtils.setOf(entityNames)],
        {numberOfIndents: 1}
    );
  }

  generateParticleClass(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]): string {
    const {typeAliases, classes, handleClassDecl} = this.generateParticleClassComponents(particle, nodeGenerators);
    return `
${typeAliases.join(`\n`)}

abstract class Abstract${particle.name} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${this.opts.wasm ? '' : 'override '}val handles: Handles = Handles(${this.opts.wasm ? 'this' : ''})

    ${classes.join(`\n    `)}

    ${handleClassDecl}
}
`;
  }

  generateParticleClassComponents(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]) {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const specDecls: string[] = [];
    const classes: string[] = [];
    const typeAliases: string[] = [];

    nodeGenerators.forEach(nodeGenerator => {
      const kotlinGenerator = <KotlinGenerator>nodeGenerator.generator;
      classes.push(kotlinGenerator.generateClasses(nodeGenerator.hash));
      typeAliases.push(...kotlinGenerator.generateAliases(particleName));
    });

    const nodes = nodeGenerators.map(ng => ng.node);
    for (const connection of particle.connections) {
      const handleName = connection.name;
      const handleInterfaceType = this.handleInterfaceType(connection, nodes, /* particleScope= */ true);
      const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.humanName(connection));
      if (this.opts.wasm) {
        if (entityNames.length !== 1) throw new Error('Wasm does not support handles of tuples');
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${handleInterfaceType}(particle, "${handleName}", ${entityNames[0]})`);
      } else {
        specDecls.push(`"${handleName}" to ${ktUtils.setOf(entityNames)}`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }
    }

    const handleClassDecl = this.getHandlesClassDecl(particleName, specDecls, handleDecls);

    return {typeAliases, classes, handleClassDecl};
  }

  private getHandlesClassDecl(particleName: string, entitySpecs: string[], handleDecls: string[]): string {
    const header = this.opts.wasm
      ? `class Handles(
        particle: WasmParticleImpl
    )`
      : `class Handles : HandleHolderBase(
        "${particleName}",
        mapOf(${ktUtils.joinWithIndents(entitySpecs, {startIndent: 4, numberOfIndents: 3})})
    )`;

    return `${header} {
        ${handleDecls.join('\n        ')}
    }`;
  }

  generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const handleSpecs: string[] = [];

    for (const connection of particle.connections) {
      connection.direction = 'reads writes';
      const handleName = connection.name;
      const interfaceType = this.handleInterfaceType(connection, nodes, /* particleScope= */ false);
      handleDecls.push(`val ${handleName}: ${interfaceType} by handleMap`);
      handleSpecs.push(this.handleSpec(handleName, connection, nodes));
    }

    return `
class ${particleName}TestHarness<P : Abstract${particleName}>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    ${handleSpecs.join(',\n    ')}
)) {
    ${handleDecls.join('\n    ')}
}
`;
  }

  private getQueryType(connection: HandleConnectionSpec): string {
    if (!(connection.type instanceof CollectionType)) {
      return null;
    }
    const handleType = connection.type.getContainedType();
    if (!(handleType instanceof EntityType)) {
      return null;
    }
    const refinement = handleType.entitySchema.refinement;
    if (!refinement) {
      return null;
    }
    const type = refinement.getQueryParams().get('?');
    if (!type) {
      return null;
    }
    return getTypeInfo({name: type}).type;
  }
}

export class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  fieldVals: string[] = [];
  encode: string[] = [];
  decode: string[] = [];
  fieldsReset: string[] = [];
  fieldInitializers: string[] = [];
  fieldsForCopyDecl: string[] = [];
  fieldsForCopy: string[] = [];
  setFieldsToDefaults: string[] = [];
  fieldsForToString: string[] = [];
  singletonSchemaFields: string[] = [];
  collectionSchemaFields: string[] = [];
  nestedEntitySpecs: string[] = [];

  refinement = `{ _ -> true }`;
  query = 'null'; // TODO(cypher1): Support multiple queries.

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {}

  /** Returns the name of the generated class. */
  get className(): string {
    return this.node.entityClassName;
  }

  escapeIdentifier(name: string): string {
    // TODO(cypher1): Check for complex keywords (e.g. cases where both 'final' and 'final_' are keywords).
    // TODO(cypher1): Check for name overlaps (e.g. 'final' and 'final_' should not be escaped to the same identifier.
    return name + (keywords.includes(name) ? '_' : '');
  }

  // TODO: allow optional fields in kotlin
  addField({field, typeName, refClassName, refSchemaHash, isOptional = false, isCollection = false, listTypeName}: AddFieldOptions) {
    if (typeName === 'Reference' && this.opts.wasm) return;

    const {type, decodeFn, defaultVal, schemaType} = getTypeInfo({name: typeName, isCollection, refClassName, refSchemaHash, listTypeName});
    const fixed = this.escapeIdentifier(field);
    const quotedFieldName = quote(field);
    const nullableType = type.endsWith('?') ? type : `${type}?`;

    this.fields.push(`${fixed}: ${type} = ${defaultVal}`);
    if (this.opts.wasm) {
      // TODO: Add support for collections in wasm.
      assert(!isCollection, 'Collection fields not supported in Kotlin wasm yet.');
      this.fieldVals.push(
        `var ${fixed} = ${fixed}\n` +
        `    get() = field\n` +
        `    private set(_value) {\n` +
        `        field = _value\n` +
        `    }`
      );
    } else if (isCollection) {
      this.fieldVals.push(
        `var ${fixed}: ${type}\n` +
        `    get() = super.getCollectionValue(${quotedFieldName}) as ${type}\n` +
        `    private set(_value) = super.setCollectionValue(${quotedFieldName}, _value)`
        );
    } else {
      const defaultFallback = defaultVal === 'null' ? '' : ` ?: ${defaultVal}`;
      this.fieldVals.push(
        `var ${fixed}: ${type}\n` +
        `    get() = super.getSingletonValue(${quotedFieldName}) as ${nullableType}${defaultFallback}\n` +
        `    private set(_value) = super.setSingletonValue(${quotedFieldName}, _value)`
      );
    }
    this.fieldsReset.push(`${fixed} = ${defaultVal}`);
    this.fieldInitializers.push(`this.${fixed} = ${fixed}`);
    this.fieldsForCopyDecl.push(`${fixed}: ${type} = this.${fixed}`);
    this.fieldsForCopy.push(`${fixed} = ${fixed}`);
    this.setFieldsToDefaults.push(`var ${fixed} = ${defaultVal}`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeName[0]}")`,
                     `    ${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeName[0]}", ${fixed}) }`);

    this.fieldsForToString.push(`${fixed} = $${fixed}`);
    if (isCollection) {
      this.collectionSchemaFields.push(`"${field}" to ${schemaType}`);
    } else {
      this.singletonSchemaFields.push(`"${field}" to ${schemaType}`);
    }

    if (typeName === 'Reference') {
      this.nestedEntitySpecs.push(`"${refSchemaHash}" to ${refClassName}`);
    }
  }

  createSchema(schemaHash: string): string {
    if (this.node.schema.equals(Schema.EMPTY)) return `Schema.EMPTY`;

    const schemaNames = this.node.schema.names.map(n => `SchemaName("${n}")`);
    return `\
Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, {startIndent: 8})}),
    SchemaFields(
        singletons = ${leftPad(ktUtils.mapOf(this.singletonSchemaFields, 30), 8, true)},
        collections = ${leftPad(ktUtils.mapOf(this.collectionSchemaFields, 30), 8, true)}
    ),
    ${quote(schemaHash)},
    refinement = ${this.refinement},
    query = ${this.query}
)`;
  }

  typeFor(name: string): string {
    return getTypeInfo({name}).type;
  }

  defaultValFor(name: string): string {
    return getTypeInfo({name}).defaultVal;
  }

  generatePredicates() {
    const expression = KTExtracter.fromSchema(this.node.schema, this);
    const refinement = this.node.schema.refinement;
    const queryType = refinement.getQueryParams().get('?');
    const lines = leftPad(expression, 8);
    if (queryType) {
      this.query = `{ data, queryArgs ->
${lines}
    }`;
    } else {
      this.refinement = `{ data ->
${lines}
    }`;
    }
  }

  generate(schemaHash: string): string { return ''; }

  generateAliases(particleName: string): string[] {
    return this.node.sources.map(s => `typealias ${s.fullName} = Abstract${particleName}.${this.className}`);
  }

  generateClassDefinition(): string {
    const ctorType = this.node.variableName == null ? '(' : ' private constructor(';

    const classDecl = `\
    class ${this.className}${ctorType}`;
    const classDef = '@Suppress("UNCHECKED_CAST")' + '\n' + classDecl;

    let baseClass: string;
    let constructorFields: string[];
    if (this.opts.wasm) {
      baseClass = 'WasmEntity';
      constructorFields = this.fields;
    } else {
      const concreteOrVariableEntity = this.node.variableName == null ? 'EntityBase' : 'VariableEntityBase';
      baseClass = ktUtils.applyFun(concreteOrVariableEntity, [
        quote(this.className), 'SCHEMA', 'entityId', 'creationTimestamp', 'expirationTimestamp'
      ]);
      constructorFields = this.fields.concat([
        'entityId: String? = null',
        'creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP',
        'expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP',
      ]);
    }

    const classInterface = `) : ${baseClass}`;

    const constructorArguments = ktUtils.joinWithIndents(constructorFields, {
      startIndent: classDecl.length + classInterface.length,
      numberOfIndents: 2
    });

    return `${classDef}${constructorArguments}${classInterface}`;
  }

  generateCopyMethods(): string {
    const fieldsForMutate = this.fieldsForCopy.concat(this.opts.wasm ? [] : [
      'entityId = entityId',
      'creationTimestamp = creationTimestamp',
      'expirationTimestamp = expirationTimestamp'
    ]);

    const fieldArgs = ktUtils.joinWithIndents(this.fieldsForCopyDecl, {startIndent: 14, numberOfIndents: 3});
    const indentOpts = {startIndent: 8 + this.className.length, numberOfIndents: 3};

    const copyMethod = `fun copy(${fieldArgs}) = ${this.className}(${
      ktUtils.joinWithIndents(this.fieldsForCopy, indentOpts)
    })`;
    const mutateMethod = `fun mutate(${fieldArgs}) = ${this.className}(${
      ktUtils.joinWithIndents(fieldsForMutate, indentOpts)
    })`;

    return `${this.opts.wasm ? `` : `/**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */`}
        ${copyMethod}
        ${this.opts.wasm ? `` : `/**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        ${mutateMethod}`}`;
  }

  generateFieldsDefinitions(): string {
    const fieldCount = Object.keys(this.node.schema.fields).length;
    const blocks: string[] = [];

    if (fieldCount !== 0) {
      blocks.push(this.fieldVals.join('\n'));
      blocks.push('');
    }

    if (this.opts.wasm) {
      blocks.push(`override var entityId = ""`);
    } else if (fieldCount !== 0) {
      const initBody = this.fieldInitializers.join('\n');
      const initBlock = ['init {', ktUtils.indent(initBody), '}'].join('\n');
      blocks.push(initBlock);
      blocks.push('');
    }

    if (blocks.length === 0) {
      return '';
    }

    return '\n' + ktUtils.indent(blocks.join('\n'), 2);
  }

  generateClasses(schemaHash: string): string {
    const fieldCount = Object.keys(this.node.schema.fields).length;
    const withFields = (populate: string) => fieldCount === 0 ? '' : populate;

    return `\

    ${this.generateClassDefinition()} {
${this.generateFieldsDefinitions()}
        ${this.generateCopyMethods()}
    ${this.opts.wasm ? `
        fun reset() {
          ${withFields(`${this.fieldsReset.join('\n            ')}`)}
        }

        override fun encodeEntity(): NullTermByteArray {
            val encoder = StringEncoder()
            encoder.encode("", entityId)
            ${this.encode.join('\n        ')}
            return encoder.toNullTermByteArray()
        }

        override fun toString() =
            "${this.className}(${this.fieldsForToString.join(', ')})"
    ` : ''}
        companion object : ${this.prefixTypeForRuntime('EntitySpec')}<${this.className}> {
            ${this.opts.wasm ? '' : `
            override val SCHEMA = ${leftPad(this.createSchema(schemaHash), 12, true)}

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                ${ktUtils.mapOf(this.nestedEntitySpecs, 16)}

            init {
                SchemaRegistry.register(SCHEMA)
            }`}
            ${!this.opts.wasm ? `
            override fun deserialize(data: RawEntity) = ${this.className}().apply {
                deserialize(data, nestedEntitySpecs)
            }` : `
            override fun decode(encoded: ByteArray): ${this.className}? {
                if (encoded.isEmpty()) return null

                val decoder = StringDecoder(encoded)
                val entityId = decoder.decodeText()
                decoder.validate("|")
                ${withFields(`
                ${this.setFieldsToDefaults.join('\n            ')}
                var i = 0
                while (i < ${fieldCount} && !decoder.done()) {
                    val _name = decoder.upTo(':').toUtf8String()
                    when (_name) {
                        ${this.decode.join('\n                    ')}
                        else -> {
                            // Ignore unknown fields until type slicing is fully implemented.
                            when (decoder.chomp(1).toUtf8String()) {
                                "T", "U" -> decoder.decodeText()
                                "N" -> decoder.decodeNum()
                                "B" -> decoder.decodeBool()
                            }
                            i--
                        }
                    }
                    decoder.validate("|")
                    i++
                }`)}
                val _rtn = ${this.className}().copy(
                    ${ktUtils.joinWithIndents(this.fieldsForCopy, {startIndent: 33, numberOfIndents: 3})}
                )
               _rtn.entityId = entityId
                return _rtn
            }`}
        }
    }`;
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
