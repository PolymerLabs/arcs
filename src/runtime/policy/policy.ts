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
import {flatMap} from '../util.js';
import {assert} from '../../platform/assert-web.js';
import {ManifestStringBuilder} from '../manifest-string-builder.js';

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

  toManifestString(builder?: ManifestStringBuilder): string {
    builder = builder || new ManifestStringBuilder();
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
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): Policy {
    checkNamesAreUnique(node.targets.map(target => ({name: target.schemaName})));
    const targets = node.targets.map(target => PolicyTarget.fromAstNode(target, buildAnnotationRefs));

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
      readonly fields: PolicyField[],
      readonly retentions: {medium: PolicyRetentionMedium, encryptionRequired: boolean}[],
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {}

  toManifestString(builder?: ManifestStringBuilder): string {
    builder = builder || new ManifestStringBuilder();
    builder.push(...this.allAnnotations.map(annotation => annotation.toString()));
    builder.push(`from ${this.schemaName} access {`);
    this.fields.forEach(field => field.toManifestString(builder.withIndent()));
    builder.push('}');
    return builder.toString();
  }

  static fromAstNode(
      node: AstNode.PolicyTarget,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): PolicyTarget {
    // Convert fields.
    checkNamesAreUnique(node.fields);
    const fields = node.fields.map(field => PolicyField.fromAstNode(field, buildAnnotationRefs));

    // Process annotations.
    // TODO(b/157605585): Validate maxAge annotation.
    const allAnnotations = buildAnnotationRefs(node.annotationRefs);
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
        default:
          customAnnotations.push(annotation);
          break;
      }
    }

    return new PolicyTarget(node.schemaName, fields, retentions, customAnnotations, allAnnotations);
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
}

export class PolicyField {
  constructor(
      readonly name: string,
      readonly subfields: PolicyField[],
      readonly allowedUsages: {label: string, usage: PolicyAllowedUsageType}[],
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {
    // TODO(b/157605585): Validate field structure against Type.
  }

  toManifestString(builder?: ManifestStringBuilder): string {
    builder = builder || new ManifestStringBuilder();
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
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): PolicyField {
    // Convert subfields.
    checkNamesAreUnique(node.subfields);
    const subfields = node.subfields.map(field => PolicyField.fromAstNode(field, buildAnnotationRefs));

    // Process annotations.
    // TODO(b/157605585): Validate maxAge annotation.
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

    return new PolicyField(node.name, subfields, allowedUsages, customAnnotations, allAnnotations);
  }

  private static toAllowedUsage(annotation: AnnotationRef) {
    // TODO(b/157605585): Handle "raw" label separately?
    assert(annotation.name === allowedUsageAnnotationName);
    const usageType = annotation.params['usageType'] as string;
    checkValueInEnum(usageType, PolicyAllowedUsageType);
    return {
      usage: usageType as PolicyAllowedUsageType,
      label: annotation.params['label'] as string,
    };
  }
}

export class PolicyConfig {
  constructor(readonly name: string, readonly metadata: Map<string, string>) {}

  toManifestString(builder?: ManifestStringBuilder): string {
    builder = builder || new ManifestStringBuilder();
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
      throw new Error(`A definition for ${node.name} already exists.`);
    }
    names.add(node.name);
  }
}
