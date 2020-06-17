/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {KotlinGenerationUtils, leftPad, quote} from './kotlin-generation-utils.js';
import {AddFieldOptions, ClassGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import minimist from 'minimist';
import {getTypeInfo, escapeIdentifier} from './kotlin-codegen-shared.js';
import {assert} from '../platform/assert-web.js';
import {Schema} from '../runtime/schema.js';
import {KTExtracter} from './kotlin-refinement-generator.js';

const ktUtils = new KotlinGenerationUtils();

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

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {
  }

  generateClasses(): string {
    return `\

    ${this.generateClassDefinition()} {
        ${this.generateFieldsDefinitions()}
        ${this.generateCopyMethods()}
        ${this.maybeGenerateWasmSpecificMethods()}
        ${this.generateEntitySpec()}
    }`;
  }

  /** Returns the name of the generated class. */
  get className(): string {
    return this.node.entityClassName;
  }

  // TODO: allow optional fields in kotlin
  addField({field, typeName, refClassName, refSchemaHash, isOptional = false, isCollection = false, listTypeName}: AddFieldOptions) {
    if (typeName === 'Reference' && this.opts.wasm) return;

    const {type, decodeFn, defaultVal, schemaType} = getTypeInfo({
      name: typeName,
      isCollection,
      refClassName,
      refSchemaHash,
      listTypeName
    });
    const fixed = escapeIdentifier(field);
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

  generateSchema(): string {
    if (this.node.schema.equals(Schema.EMPTY)) return `Schema.EMPTY`;

    const schemaNames = this.node.schema.names.map(n => `SchemaName("${n}")`);
    const {refinement, query} = this.generatePredicates();
    return `\
Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, {startIndent: 8})}),
    SchemaFields(
        singletons = ${leftPad(ktUtils.mapOf(this.singletonSchemaFields, 30), 8, true)},
        collections = ${leftPad(ktUtils.mapOf(this.collectionSchemaFields, 30), 8, true)}
    ),
    ${quote(this.node.hash)},
    refinement = ${refinement},
    query = ${query}
)`;
  }

  private generatePredicates(): {query: string, refinement: string} {
    const schema = this.node.schema;
    const hasQuery = schema.refinement && schema.refinement.getQueryParams().get('?');
    const hasRefinement = !!schema.refinement;
    const expression = leftPad(KTExtracter.fromSchema(this.node.schema), 8);

    return {
      // TODO(cypher1): Support multiple queries.
      query: hasQuery ? `{ data, queryArgs ->
${expression}
    }` : 'null',
      refinement: (hasRefinement && !hasQuery) ? `{ data ->
${expression}
    }` : `{ _ -> true }`
    };
  }

  generate(): string {
    return '';
  }

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

    const copyBaseEntity = `.also { this.copyLatentDataInto(it) }`;
    let copy = copyMethod;
    let mutate = mutateMethod;

    // Add clauses to copy entity base data (except for Wasm).
    if (this.node.variableName !== null && !this.opts.wasm) {
      // The `also` clause should go on a newline if the copy / mutate expression fits on one line.
      const newlineAlsoClause = '\n' + ktUtils.indent(copyBaseEntity, 3);
      copy += (copyMethod.includes('\n') ? copyBaseEntity : newlineAlsoClause);
      mutate += (mutateMethod.includes('\n') ? copyBaseEntity : newlineAlsoClause);
    }

    return `${this.opts.wasm ? `` : `/**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */`}
        ${copy}
        ${this.opts.wasm ? `` : `/**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        ${mutate}`}`;
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

  private maybeGenerateWasmSpecificMethods() {
    if (!this.opts.wasm) return '';
    return `
        fun reset() {
            ${ktUtils.indentFollowing(this.fieldsReset, 3)}
        }

        override fun encodeEntity(): NullTermByteArray {
            val encoder = StringEncoder()
            encoder.encode("", entityId)
            ${ktUtils.indentFollowing(this.encode, 3)}
            return encoder.toNullTermByteArray()
        }

        override fun toString() =
            "${this.className}(${this.fieldsForToString.join(', ')})"
`;
  }

  private generateEntitySpec() {
    const fieldCount = Object.keys(this.node.schema.fields).length;
    return `companion object : ${this.prefixTypeForRuntime('EntitySpec')}<${this.className}> {
            ${this.opts.wasm ? '' : `
            override val SCHEMA = ${leftPad(this.generateSchema(), 12, true)}

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
                ${fieldCount > 0 ? (`
                ${ktUtils.indentFollowing(this.setFieldsToDefaults, 3)}
                var i = 0
                while (i < ${fieldCount} && !decoder.done()) {
                    val _name = decoder.upTo(':').toUtf8String()
                    when (_name) {
                        ${ktUtils.indentFollowing(this.decode, 5)}
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
                }`) : ''}
                val _rtn = ${this.className}().copy(
                    ${ktUtils.joinWithIndents(this.fieldsForCopy, {startIndent: 33, numberOfIndents: 3})}
                )
               _rtn.entityId = entityId
                return _rtn
            }`}
        }`;
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
