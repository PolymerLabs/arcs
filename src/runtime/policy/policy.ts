/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import * as AstNode from '../manifest-ast-nodes.js';
import {AnnotationRef} from '../recipe/annotation.js';
import {assert} from '../../platform/assert-web.js';
import {ManifestStringBuilder} from '../manifest-string-builder.js';
import {Ttl, Capabilities, Capability, Persistence, CapabilityRange, Encryption} from '../capabilities.js';
import {EntityType, InterfaceType, Type} from '../type.js';
import {FieldPathType, resolveFieldPathType} from '../field-path.js';

export enum PolicyEgressType {
  Logging = 'Logging',
  FederatedAggregation = 'FederatedAggregation',
}

export enum PolicyRetentionMedium {
  Ram = 'Ram',
  Disk = 'Disk',
}

export enum PolicyAllowedUsageType {
  Any = '*',
  Egress = 'egress',
  Join = 'join',
}

const intendedPurposeAnnotationName = 'intendedPurpose';
const egressTypeAnnotationName = 'egressType';
const allowedRetentionAnnotationName = 'allowedRetention';
const allowedUsageAnnotationName = 'allowedUsage';
const maxAgeAnnotationName = 'maxAge';

/**
 * Definition of a dataflow policy.
 *
 * This class is just a thin wrapper around the Policy AST node. There's no
 * actual functionality other than validating the input is correct.
 */
export class Policy {
  constructor(
      readonly name: string,
      readonly targets: PolicyTarget[],
      readonly configs: PolicyConfig[],
      readonly description: string | null,
      readonly egressType: PolicyEgressType | null,
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {}

  toManifestString(builder = new ManifestStringBuilder()): string {
    builder.push(...this.allAnnotations.map(annotation => annotation.toString()));
    builder.push(`policy ${this.name} {`);
    builder.withIndent(builder => {
      this.targets.forEach(target => target.toManifestString(builder));
      this.configs.forEach(config => config.toManifestString(builder));
    });
    builder.push('}');
    return builder.toString();
  }

  static fromAstNode(
      node: AstNode.Policy,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[],
      findTypeByName: (name: string) => EntityType | InterfaceType | undefined): Policy {
    checkNamesAreUnique(node.targets.map(target => ({name: target.schemaName})));
    const targets = node.targets.map(target => PolicyTarget.fromAstNode(target, buildAnnotationRefs, findTypeByName));

    checkNamesAreUnique(node.configs);
    const configs = node.configs.map(config => PolicyConfig.fromAstNode(config));

    // Process annotations.
    const allAnnotations = buildAnnotationRefs(node.annotationRefs);
    let description: string | null = null;
    let egressType: PolicyEgressType | null = null;
    const customAnnotations: AnnotationRef[] = [];
    for (const annotation of allAnnotations) {
      switch (annotation.name) {
        case intendedPurposeAnnotationName:
          description = this.toDescription(annotation);
          break;
        case egressTypeAnnotationName:
          egressType = this.toEgressType(annotation);
          break;
        default:
          customAnnotations.push(annotation);
          break;
      }
    }

    return new Policy(node.name, targets, configs, description, egressType, customAnnotations, allAnnotations);
  }

  private static toDescription(annotation: AnnotationRef): string {
    assert(annotation.name === intendedPurposeAnnotationName);
    return annotation.params['description'] as string;
  }

  private static toEgressType(annotation: AnnotationRef): PolicyEgressType {
    assert(annotation.name === egressTypeAnnotationName);
    const egressType = annotation.params['type'] as string;
    checkValueInEnum(egressType, PolicyEgressType);
    return egressType as PolicyEgressType;
  }
}

export class PolicyTarget {
  constructor(
      readonly schemaName: string,
      readonly type: Type,
      readonly fields: PolicyField[],
      readonly retentions: {medium: PolicyRetentionMedium, encryptionRequired: boolean}[],
      readonly maxAge: Ttl,
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {}

  toManifestString(builder = new ManifestStringBuilder()): string {
    builder.push(...this.allAnnotations.map(annotation => annotation.toString()));
    builder.push(`from ${this.schemaName} access {`);
    this.fields.forEach(field => field.toManifestString(builder.withIndent()));
    builder.push('}');
    return builder.toString();
  }

  static fromAstNode(
      node: AstNode.PolicyTarget,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[],
      findTypeByName: (name: string) => EntityType | InterfaceType | undefined): PolicyTarget {
    // Check type.
    const type = findTypeByName(node.schemaName);
    if (!type) {
      throw new Error(`Unknown type name: ${node.schemaName}.`);
    }

    // Convert fields.
    checkNamesAreUnique(node.fields);
    const fields = node.fields.map(field => PolicyField.fromAstNode(field, type, buildAnnotationRefs));

    // Process annotations.
    const allAnnotations = buildAnnotationRefs(node.annotationRefs);
    let maxAge = Ttl.zero();
    const retentionMediums: Set<PolicyRetentionMedium> = new Set();
    const retentions: {medium: PolicyRetentionMedium, encryptionRequired: boolean}[] = [];
    const customAnnotations: AnnotationRef[] = [];
    for (const annotation of allAnnotations) {
      switch (annotation.name) {
        case allowedRetentionAnnotationName: {
          const retention = this.toRetention(annotation);
          if (retentionMediums.has(retention.medium)) {
            throw new Error(`@${allowedRetentionAnnotationName} has already been defined for ${retention.medium}.`);
          }
          retentionMediums.add(retention.medium);
          retentions.push(retention);
          break;
        }
        case maxAgeAnnotationName:
          maxAge = this.toMaxAge(annotation);
          break;
        default:
          customAnnotations.push(annotation);
          break;
      }
    }

    return new PolicyTarget(node.schemaName, type, fields, retentions, maxAge, customAnnotations, allAnnotations);
  }

  private static toRetention(annotation: AnnotationRef) {
    assert(annotation.name === allowedRetentionAnnotationName);
    const medium = annotation.params['medium'] as string;
    checkValueInEnum(medium, PolicyRetentionMedium);
    return {
      medium: medium as PolicyRetentionMedium,
      encryptionRequired: annotation.params['encryption'] as boolean,
    };
  }

  private static toMaxAge(annotation: AnnotationRef): Ttl {
    assert(annotation.name === maxAgeAnnotationName);
    const maxAge = annotation.params['age'] as string;
    return Ttl.fromString(maxAge);
  }

  toCapabilities(): Capabilities[] {
    return this.retentions.map(retention => {
      const ranges: Capability[] = [];
      switch (retention.medium) {
        case PolicyRetentionMedium.Disk:
          ranges.push(Persistence.onDisk());
          break;
        case PolicyRetentionMedium.Ram:
          ranges.push(Persistence.inMemory());
          break;
        default:
          throw new Error(`Unsupported retention medium ${retention.medium}`);
      }
      if (retention.encryptionRequired) {
        ranges.push(new Encryption(true));
      }
      ranges.push(this.maxAge);
      return Capabilities.create(ranges);
    });
  }
}

export class PolicyField {
  constructor(
      readonly name: string,
      readonly type: FieldPathType,
      readonly subfields: PolicyField[],
      /**
       * The acceptable usages this field. Each (label, usage) pair defines a
       * usage type that is acceptable for a given redaction label. The empty
       * string label describes the usage for the raw data, given no redaction.
       */
      readonly allowedUsages: {label: string, usage: PolicyAllowedUsageType}[],
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {}

  toManifestString(builder = new ManifestStringBuilder()): string {
    builder.push(...this.allAnnotations.map(annotation => annotation.toString()));
    if (this.subfields.length) {
      builder.push(`${this.name} {`);
      this.subfields.forEach(field => field.toManifestString(builder.withIndent()));
      builder.push('}');
    } else {
      builder.push(`${this.name},`);
    }
    return builder.toString();
  }

  static fromAstNode(
      node: AstNode.PolicyField,
      parentType: FieldPathType,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): PolicyField {
    // Validate field name against type.
    const type = resolveFieldPathType([node.name], parentType);

    // Convert subfields.
    checkNamesAreUnique(node.subfields);
    const subfields = node.subfields.map(field => PolicyField.fromAstNode(field, type, buildAnnotationRefs));

    // Process annotations.
    const allAnnotations = buildAnnotationRefs(node.annotationRefs);
    const usages: Map<string, Set<PolicyAllowedUsageType>> = new Map();
    const allowedUsages: {label: string, usage: PolicyAllowedUsageType}[] = [];
    const customAnnotations: AnnotationRef[] = [];
    for (const annotation of allAnnotations) {
      switch (annotation.name) {
        case allowedUsageAnnotationName: {
          const allowedUsage = this.toAllowedUsage(annotation);
          if (!usages.has(allowedUsage.label)) {
            usages.set(allowedUsage.label, new Set());
          }
          const usageTypes = usages.get(allowedUsage.label);
          if (usageTypes.has(allowedUsage.usage)) {
            throw new Error(`Usage of label '${allowedUsage.label}' for usage type '${allowedUsage.usage}' has already been allowed.`);
          }
          usageTypes.add(allowedUsage.usage);
          allowedUsages.push(allowedUsage);
          break;
        }
        default:
          customAnnotations.push(annotation);
          break;
      }
    }

    if (allowedUsages.length === 0) {
      allowedUsages.push({label: '', usage: PolicyAllowedUsageType.Any});
    }

    return new PolicyField(node.name, type, subfields, allowedUsages, customAnnotations, allAnnotations);
  }

  private static toAllowedUsage(annotation: AnnotationRef) {
    assert(annotation.name === allowedUsageAnnotationName);
    const usageType = annotation.params['usageType'] as string;
    checkValueInEnum(usageType, PolicyAllowedUsageType);
    const label = annotation.params['label'] as string;
    return {
      usage: usageType as PolicyAllowedUsageType,
      label: label === 'raw' ? '' : label,
    };
  }
}

export class PolicyConfig {
  constructor(readonly name: string, readonly metadata: Map<string, string>) {}

  toManifestString(builder = new ManifestStringBuilder()): string {
    builder.push(`config ${this.name} {`);
    builder.withIndent(builder => {
      for (const [k, v] of this.metadata) {
        builder.push(`${k}: '${v}'`);
      }
    });
    builder.push('}');
    return builder.toString();
  }

  static fromAstNode(node: AstNode.PolicyConfig): PolicyConfig {
    return new PolicyConfig(node.name, node.metadata);
  }
}

/** Checks that the given value is an element in the given enum. Throws otherwise. */
function checkValueInEnum(value: string, enumDef: {}) {
  const keys = Object.keys(enumDef).filter(key => typeof key === 'string');
  const values = keys.map(key => enumDef[key]);
  if (!(values.includes(value))) {
    throw new Error(`Expected one of: ${values.join(', ')}. Found: ${value}.`);
  }
}

/** Checks that the given AST nodes have unique names. Throws otherwise. */
function checkNamesAreUnique(nodes: {name: string}[]) {
  const names: Set<string> = new Set();
  for (const node of nodes) {
    if (names.has(node.name)) {
      throw new Error(`A definition for '${node.name}' already exists.`);
    }
    names.add(node.name);
  }
}
