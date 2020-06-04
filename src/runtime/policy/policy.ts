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
import {assert} from '../../platform/chai-web.js';

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

  toManifestString(): string {
    return [
      ...this.allAnnotations.map(annotation => annotation.toString()),
      `policy ${this.name} {`,
      ...flatMap(this.targets, target => indentLines(target.toManifestString())),
      ...flatMap(this.configs, config => indentLines(config.toManifestString())),
      '}',
    ].join('\n');
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

class PolicyTarget {
  constructor(
      readonly schemaName: string,
      readonly fields: PolicyField[],
      readonly retentions: {medium: PolicyRetentionMedium, encryptionRequired: boolean}[],
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {}

  toManifestString(): string {
    return [
      ...this.allAnnotations.map(annotation => annotation.toString()),
      `from ${this.schemaName} access {`,
      ...flatMap(this.fields, field => indentLines(field.toManifestString())),
      '}',
    ].join('\n');
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

class PolicyField {
  constructor(
      readonly name: string,
      readonly subfields: PolicyField[],
      readonly allowedUsages: {label: string, usage: PolicyAllowedUsageType}[],
      readonly customAnnotations: AnnotationRef[],
      private readonly allAnnotations: AnnotationRef[]) {
    // TODO(b/157605585): Validate field structure against Type.
  }

  toManifestString(): string {
    const lines = this.allAnnotations.map(annotation => annotation.toString());
    if (this.subfields.length) {
      lines.push(
        `${this.name} {`,
        ...flatMap(this.subfields, field => indentLines(field.toManifestString())),
        '}');
    } else {
      lines.push(`${this.name},`);
    }
    return lines.join('\n');
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

class PolicyConfig {
  constructor(readonly name: string, readonly metadata: Map<string, string>) {}

  toManifestString(): string {
    const lines = [`config ${this.name} {`];
    for (const [k, v] of this.metadata) {
      lines.push(`  ${k}: '${v}'`);
    }
    lines.push('}');
    return lines.join('\n');
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

function indentLines(str: string): string[] {
  return str.split('\n').map(line => '  ' + line);
}
