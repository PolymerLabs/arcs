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

export enum PolicyEgressType {
  Logging = 'Logging',
  FederatedAggregation = 'FederatedAggregation',
}

export enum PolicyRetentionMedium {
  Ram = 'Ram',
  Disk = 'Disk',
}

export enum PolicyAllowedUsageType {
  Any = 'Any',
  Egress = 'Egress',
  Join = 'Join',
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
      private readonly annotationRefs: AnnotationRef[]) {
    this.validateEgressType();
  }

  get description(): string | null {
    const description = this.annotationRefs.find(a => a.name === intendedPurposeAnnotationName);
    return description ? description.params['description'] as string : null;
  }

  get egressType(): PolicyEgressType {
    const egressType = this.annotationRefs.find(a => a.name === egressTypeAnnotationName);
    return PolicyEgressType[egressType.params['type'] as string];
  }

  get annotations() {
    const specialAnnotations = [intendedPurposeAnnotationName, egressTypeAnnotationName];
    return this.annotationRefs.filter(annotation => !specialAnnotations.includes(annotation.name));
  }

  private validateEgressType() {
    const egressType = this.annotationRefs.find(annotation => annotation.name === egressTypeAnnotationName);
    if (egressType) {
      checkValueInEnum(egressType.params['type'], PolicyEgressType);
    }
  }

  toManifestString(): string {
    return [
      ...this.annotationRefs.map(annotation => annotation.toString()),
      `policy ${this.name} {`,
      ...flatMap(this.targets, target => indentLines(target.toManifestString())),
      ...flatMap(this.configs, config => indentLines(config.toManifestString())),
      '}',
    ].join('\n');
  }

  static fromAstNode(
      node: AstNode.Policy,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): Policy {
    const annotationRefs = buildAnnotationRefs(node.annotationRefs);

    checkNamesAreUnique(node.targets.map(target => ({name: target.schemaName})));
    const targets = node.targets.map(target => PolicyTarget.fromAstNode(target, buildAnnotationRefs));

    checkNamesAreUnique(node.configs);
    const configs = node.configs.map(config => PolicyConfig.fromAstNode(config));

    return new Policy(node.name, targets, configs, annotationRefs);
  }
}

class PolicyTarget {
  constructor(
      readonly schemaName: string,
      readonly fields: PolicyField[],
      private readonly annotationRefs: AnnotationRef[]) {
    this.validateRetentions();
    // TODO(b/157605585): Validate maxAge annotation.
  }

  get retentions() {
    return this.annotationRefs
        .filter(annotation => annotation.name === allowedRetentionAnnotationName)
        .map(annotation => ({
          medium: PolicyRetentionMedium[annotation.params['medium'] as string],
          encryptionRequired: annotation.params['encryption'] as boolean,
        }));
  }

  get annotations() {
    return this.annotationRefs.filter(annotation => annotation.name !== allowedRetentionAnnotationName);
  }

  private validateRetentions() {
    const retentionMediums: Set<PolicyRetentionMedium> = new Set();
    this.annotationRefs
      .filter(annotation => annotation.name === allowedRetentionAnnotationName)
      .forEach(annotation => {
        const mediumParam = annotation.params['medium'];
        checkValueInEnum(mediumParam, PolicyRetentionMedium);
        const medium = mediumParam as PolicyRetentionMedium;
        if (retentionMediums.has(medium)) {
          throw new Error(`@${allowedRetentionAnnotationName} has already been defined for ${medium}.`);
        }
        retentionMediums.add(medium);
      });
  }

  toManifestString(): string {
    return [
      ...this.annotationRefs.map(annotation => annotation.toString()),
      `from ${this.schemaName} access {`,
      ...flatMap(this.fields, field => indentLines(field.toManifestString())),
      '}',
    ].join('\n');
  }

  static fromAstNode(
      node: AstNode.PolicyTarget,
      buildAnnotationRefs: (ref: AstNode.AnnotationRef[]) => AnnotationRef[]): PolicyTarget {
    const annotationRefs = buildAnnotationRefs(node.annotationRefs);

    // Convert fields.
    checkNamesAreUnique(node.fields);
    const fields = node.fields.map(field => PolicyField.fromAstNode(field, buildAnnotationRefs));

    return new PolicyTarget(node.schemaName, fields, annotationRefs);
  }
}

class PolicyField {
  constructor(
      readonly name: string,
      readonly subfields: PolicyField[],
      private readonly annotationRefs: AnnotationRef[]) {
    this.validateAllowedUsages();
    // TODO(b/157605585): Validate field structure against Type.
  }

  get allowedUsages() {
    // TODO(b/157605585): Handle "raw" label separately?
    return this.annotationRefs
        .filter(annotation => annotation.name === allowedUsageAnnotationName)
        .map(annotation => ({
          usage: toAllowedUsageEnum(annotation.params['usageType']),
          label: annotation.params['label'] as string,
        }));
  }

  get annotations() {
    return this.annotationRefs.filter(annotation => annotation.name !== allowedUsageAnnotationName);
  }

  private validateAllowedUsages() {
    const usages: Map<string, Set<PolicyAllowedUsageType>> = new Map();
    this.annotationRefs
      .filter(annotation => annotation.name === allowedUsageAnnotationName)
      .forEach(annotation => {
        const label = annotation.params['label'] as string;
        const usageTypeParam = annotation.params['usageType'] as string;
        const usageType = toAllowedUsageEnum(usageTypeParam);
        if (!usages.has(label)) {
          usages.set(label, new Set());
        }
        const usageTypes = usages.get(label);
        if (usageTypes.has(usageType)) {
          throw new Error(`Usage of label '${label}' for usage type '${usageTypeParam}' has already been allowed.`);
        }
        usageTypes.add(usageType);
      });
  }

  toManifestString(): string {
    const lines = this.annotationRefs.map(annotation => annotation.toString());
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
    const annotationRefs = buildAnnotationRefs(node.annotationRefs);

    // Convert subfields.
    checkNamesAreUnique(node.subfields);
    const subfields = node.subfields.map(field => PolicyField.fromAstNode(field, buildAnnotationRefs));

    return new PolicyField(node.name, subfields, annotationRefs);
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

/** Converts the given string to a value of PolicyAllowedUsageType. */
// tslint:disable-next-line: no-any
function toAllowedUsageEnum(value: any): PolicyAllowedUsageType {
  switch (value) {
    case '*':
      return PolicyAllowedUsageType.Any;
    case 'join':
      return PolicyAllowedUsageType.Join;
    case 'egress':
      return PolicyAllowedUsageType.Egress;
    default:
      throw new Error(`Unknown usage type: ${value}`);
  }
}

/** Checks that the given value is an element in the given enum. Throws otherwise. */
// tslint:disable-next-line: no-any
function checkValueInEnum(value: any, enumDef: {}) {
  if (!(value in enumDef)) {
    const keys = Object.keys(enumDef).filter(key => typeof key === 'string');
    throw new Error(`Expected one of: ${keys.join(', ')}. Found: ${value}.`);
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
