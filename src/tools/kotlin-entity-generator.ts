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
import {escapeIdentifier} from './kotlin-codegen-shared.js';
import {generateFields, KotlinSchemaField} from './kotlin-schema-field.js';

const ktUtils = new KotlinGenerationUtils();

type ExtendedSchemaField = KotlinSchemaField & {
  escaped: string,
  nullableType: string,
};

export class KotlinEntityGenerator implements EntityGenerator {

  private fields: ExtendedSchemaField[];

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {
    this.fields = generateFields(node).map(field => {
      const type = field.type.kotlinType;
      return {
        ...field,
        escaped: escapeIdentifier(field.name),
        nullableType: type.endsWith('?') ? type : `${type}?`
      };
    });
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
    let constructorFields = this.fields.map(({escaped, type}) => `${escaped}: ${type.kotlinType} = ${type.defaultVal}`);
    if (this.opts.wasm) {
      baseClass = 'WasmEntity';
    } else {
      const concreteOrVariableEntity =
        this.node.variableName == null ? 'arcs.sdk.EntityBase' : 'arcs.core.entity.VariableEntityBase';
      baseClass = ktUtils.applyFun(
        concreteOrVariableEntity,
        [quote(this.className), 'SCHEMA', 'entityId', 'creationTimestamp', 'expirationTimestamp', this.node.isNested + ''],
        {numberOfIndents: 1}
      );

      constructorFields = constructorFields.concat([
        'entityId: String? = null',
        'creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP',
        'expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP',
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
      this.fields.map(({escaped, type}) => `${escaped}: ${type.kotlinType} = this.${escaped}`),
      {startIndent: 14, numberOfIndents: 3}
    );

    const indentOpts = {startIndent: 8 + this.className.length, numberOfIndents: 3};
    const fieldsForCopy = this.fields.map(({escaped}) => `${escaped} = ${escaped}`);
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
    for (const {name, type, escaped, nullableType} of this.fields) {
      if (this.opts.wasm) {
        // TODO: Add support for collections in wasm.
        assert(!type.isCollection, 'Collection fields not supported in Kotlin wasm yet.');
        fieldVals.push(`\
var ${escaped} = ${escaped}
    get() = field
    private set(_value) {
        field = _value
    }`
        );
      } else if (type.isCollection) {
        fieldVals.push(`\
var ${escaped}: ${type.kotlinType}
    get() = super.getCollectionValue("${name}") as ${type.kotlinType}
    private set(_value) = super.setCollectionValue("${name}", _value)`
        );
      } else {
        const defaultFallback = type.defaultVal === 'null' ? '' : ` ?: ${type.defaultVal}`;
        fieldVals.push(`\
var ${escaped}: ${type.kotlinType}
    get() = super.getSingletonValue("${name}") as ${nullableType}${defaultFallback}
    private set(_value) = super.setSingletonValue("${name}", _value)`
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
      const initBody = this.fields.map(({escaped}) => `this.${escaped} = ${escaped}`).join('\n');
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
              this.fields.map(({escaped, type}) => `${escaped} = ${type.defaultVal}`), 3
            )}
        }

        override fun encodeEntity(): NullTermByteArray {
            val encoder = StringEncoder()
            encoder.encode("", entityId)
            ${ktUtils.indentFollowing(
              this.fields.map(({name, escaped, type}) =>
                `${escaped}.let { encoder.encode("${name}:${type.arcsTypeName[0]}", ${escaped}) }`),
              3
            )}
            return encoder.toNullTermByteArray()
        }

        override fun toString() =
            "${this.className}(${this.fields.map(({escaped}) => `${escaped} = $${escaped}`).join(', ')})"
`;
  }

  private async generateEntitySpec() {
    const fieldCount = Object.keys(this.node.schema.fields).length;
    return `companion object : ${this.opts.wasm ? 'WasmEntitySpec' : 'arcs.sdk.EntitySpec'}<${this.className}> {
            ${this.opts.wasm ? '' : `
            override val SCHEMA = ${leftPad(await generateSchema(this.node.schema), 12, true)}

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                ${ktUtils.mapOf(
                  this.fields
                    .map(field => field.type.unwrap())
                    .filter(type => type.isSchema)
                    .map(type => `"${type.schemaHash}" to ${type.kotlinType}`),
                  16
                )}

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }`}
            ${!this.opts.wasm ? `
            override fun deserialize(data: arcs.core.data.RawEntity) = ${this.className}().apply {
                deserialize(data, nestedEntitySpecs)
            }` : `
            override fun decode(encoded: ByteArray): ${this.className}? {
                if (encoded.isEmpty()) return null

                val decoder = StringDecoder(encoded)
                val entityId = decoder.decodeText()
                decoder.validate("|")
                ${fieldCount > 0 ? (`
                ${ktUtils.indentFollowing(this.fields.map(({escaped, type}) => `var ${escaped} = ${type.defaultVal}`), 3)}
                var i = 0
                while (i < ${fieldCount} && !decoder.done()) {
                    val _name = decoder.upTo(':').toUtf8String()
                    when (_name) {
                        ${ktUtils.indentFollowing(this.fields.map(({name, type, escaped}) => `"${name}" -> {
                        decoder.validate("${type.arcsTypeName[0]}")
                        ${escaped} = decoder.${type.decodeFn}
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
                      this.fields.map(({escaped}) => `${escaped} = ${escaped}`),
                      {startIndent: 33, numberOfIndents: 3}
                    )}
                )
               _rtn.entityId = entityId
                return _rtn
            }`}
        }`;
  }
}
