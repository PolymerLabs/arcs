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
import {EntityGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import minimist from 'minimist';
import {generateSchema} from './kotlin-schema-generator.js';
import {assert} from '../platform/assert-web.js';
import {AddFieldOptions, EntityDescriptorBase} from './schema2base.js';
import {escapeIdentifier, getTypeInfo} from './kotlin-codegen-shared.js';

const ktUtils = new KotlinGenerationUtils();

/**
 * Metadata about a field in a schema.
 */
export type KotlinSchemaField = AddFieldOptions & {
  type: string,
  decodeFn: string,
  defaultVal: string,
  escaped: string,
  nullableType: string
};

/**
 * Composes and holds a list of KotlinSchemaField for a SchemaNode.
 */
export class KotlinEntityDescriptor extends EntityDescriptorBase {

  readonly fields: KotlinSchemaField[] = [];

  constructor(node: SchemaNode, private forWasm: boolean) {
    super(node);
    this.process();
  }

  addField(opts: AddFieldOptions) {
    if (opts.typeName === 'Reference' && this.forWasm) return;

    const typeInfo = getTypeInfo({name: opts.typeName, ...opts});
    const type = typeInfo.type;

    this.fields.push({
      ...opts,
      ...typeInfo,
      escaped: escapeIdentifier(opts.field),
      nullableType: type.endsWith('?') ? type : `${type}?`
    });
  }
}

export class KotlinEntityGenerator implements EntityGenerator {

  private entityDescriptor: KotlinEntityDescriptor;

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {
    this.entityDescriptor = new KotlinEntityDescriptor(node, opts.wasm);
  }

  async generateClasses(): Promise<string> {
    return `\

    ${this.generateClassDefinition()} {
        ${this.generateFieldsDefinitions()}
        ${this.generateCopyMethods()}
        ${this.maybeGenerateWasmSpecificMethods()}
        ${await this.generateEntitySpec()}
    }`;
  }

  /** Returns the name of the generated class. */
  get className(): string {
    return this.node.entityClassName;
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
    let constructorFields = this.mapFields(({escaped, type, defaultVal}) => `${escaped}: ${type} = ${defaultVal}`);
    if (this.opts.wasm) {
      baseClass = 'WasmEntity';
    } else {
      const concreteOrVariableEntity = this.node.variableName == null ? 'EntityBase' : 'VariableEntityBase';
      baseClass = ktUtils.applyFun(concreteOrVariableEntity, [
        quote(this.className), 'SCHEMA', 'entityId', 'creationTimestamp', 'expirationTimestamp', this.entityDescriptor.node.isNested + ''
      ]);

      constructorFields = constructorFields.concat([
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
    const fieldArgs = ktUtils.joinWithIndents(
      this.mapFields(({escaped, type}) => `${escaped}: ${type} = this.${escaped}`),
      {startIndent: 14, numberOfIndents: 3}
    );

    const indentOpts = {startIndent: 8 + this.className.length, numberOfIndents: 3};
    const fieldsForCopy = this.mapFields(({escaped}) => `${escaped} = ${escaped}`);
    const copyMethod = `fun copy(${fieldArgs}) = ${this.className}(${
      ktUtils.joinWithIndents(fieldsForCopy, indentOpts)
    })`;

    const fieldsForMutate = fieldsForCopy.concat(this.opts.wasm ? [] : [
      'entityId = entityId',
      'creationTimestamp = creationTimestamp',
      'expirationTimestamp = expirationTimestamp'
    ]);
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

    const fieldVals: string[] = [];
    for (const {field, type, isCollection, escaped, defaultVal, nullableType} of this.entityDescriptor.fields) {
      if (this.opts.wasm) {
        // TODO: Add support for collections in wasm.
        assert(!isCollection, 'Collection fields not supported in Kotlin wasm yet.');
        fieldVals.push(`\
var ${escaped} = ${escaped}
    get() = field
    private set(_value) {
        field = _value
    }`
        );
      } else if (isCollection) {
        fieldVals.push(`\
var ${escaped}: ${type}
    get() = super.getCollectionValue("${field}") as ${type}
    private set(_value) = super.setCollectionValue("${field}", _value)`
        );
      } else {
        const defaultFallback = defaultVal === 'null' ? '' : ` ?: ${defaultVal}`;
        fieldVals.push(`\
var ${escaped}: ${type}
    get() = super.getSingletonValue("${field}") as ${nullableType}${defaultFallback}
    private set(_value) = super.setSingletonValue("${field}", _value)`
        );
      }
    }

    if (fieldCount !== 0) {
      blocks.push(fieldVals.join('\n'));
      blocks.push('');
    }

    if (this.opts.wasm) {
      blocks.push(`override var entityId = ""`);
    } else if (fieldCount !== 0) {
      const initBody = this.mapFields(({escaped}) => `this.${escaped} = ${escaped}`).join('\n');
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
            ${ktUtils.indentFollowing(
              this.mapFields(({escaped, defaultVal}) => `${escaped} = ${defaultVal}`), 3
            )}
        }

        override fun encodeEntity(): NullTermByteArray {
            val encoder = StringEncoder()
            encoder.encode("", entityId)
            ${ktUtils.indentFollowing(
              this.mapFields(({field, escaped, typeName}) =>
                `${escaped}.let { encoder.encode("${field}:${typeName[0]}", ${escaped}) }`),
              3
            )}
            return encoder.toNullTermByteArray()
        }

        override fun toString() =
            "${this.className}(${this.mapFields(({escaped}) => `${escaped} = $${escaped}`).join(', ')})"
`;
  }

  private extractUnderlyingField(field: KotlinSchemaField): KotlinSchemaField {
    if (field.typeName === 'List') {
      return {
        typeName: field.listTypeInfo.name,
        refSchemaHash: field.listTypeInfo.refSchemaHash,
        isInlineClass: field.listTypeInfo.isInlineClass
      } as KotlinSchemaField;
    }
    return field;
  }

  private mapFieldToSchemaMapEntry({refSchemaHash, typeName, refClassName}: KotlinSchemaField): string {
    return `"${refSchemaHash}" to ${refClassName ? refClassName : typeName}`;
  }

  private async generateEntitySpec() {
    const fieldCount = Object.keys(this.node.schema.fields).length;
    return `companion object : ${this.prefixTypeForRuntime('EntitySpec')}<${this.className}> {
            ${this.opts.wasm ? '' : `
            override val SCHEMA = ${leftPad(await generateSchema(this.node.schema), 12, true)}

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                ${ktUtils.mapOf(
                  this.entityDescriptor.fields
                    .map(this.extractUnderlyingField)
                    .filter(f => f.typeName === 'Reference' || f.isInlineClass)
                    .map(this.mapFieldToSchemaMapEntry),
                  16
                )}

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
                ${ktUtils.indentFollowing(this.mapFields(({escaped, defaultVal}) => `var ${escaped} = ${defaultVal}`), 3)}
                var i = 0
                while (i < ${fieldCount} && !decoder.done()) {
                    val _name = decoder.upTo(':').toUtf8String()
                    when (_name) {
                        ${ktUtils.indentFollowing(this.mapFields(({field, escaped, typeName, decodeFn}) => `"${field}" -> {
                        decoder.validate("${typeName[0]}")
                        ${escaped} = decoder.${decodeFn}
                    }`), 5)}
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
                    ${ktUtils.joinWithIndents(
                      this.mapFields(({escaped}) => `${escaped} = ${escaped}`),
                      {startIndent: 33, numberOfIndents: 3}
                    )}
                )
               _rtn.entityId = entityId
                return _rtn
            }`}
        }`;
  }

  private mapFields(mapper: (arg: KotlinSchemaField) => string): string[] {
    return this.entityDescriptor.fields.map(mapper);
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
