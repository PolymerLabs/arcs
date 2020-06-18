/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {mapToDictionary} from '../runtime/util.js';
import {PolicyConfig, PolicyField, PolicyTarget, Policy, PolicyAllowedUsageType} from '../runtime/policy/policy.js';
import {AnnotationRef} from '../runtime/recipe/annotation.js';
import {PolicyRetentionMediumEnum, PolicyFieldUsageEnum, PolicyEgressEnum} from './manifest-proto.js';
import {annotationToProtoPayload} from './annotation2proto.js';

export function policyToProtoPayload(policy: Policy) {
  return {
    name: policy.name,
    targets: policy.targets.map(policyTargetToProtoPayload),
    configs: policy.configs.map(policyConfigToProtoPayload),
    description: policy.description,
    egressType: convertToProtoEnum(policy.egressType, PolicyEgressEnum),
    annotations: policy.customAnnotations.map(annotationToProtoPayload),
  };
}

function policyTargetToProtoPayload(target: PolicyTarget) {
  return {
    schemaType: target.schemaName,
    maxAgeMs: target.maxAge ? target.maxAge.millis : null,
    retentions: target.retentions.map(retention => ({
      medium: convertToProtoEnum(retention.medium, PolicyRetentionMediumEnum),
      encryptionRequired: retention.encryptionRequired,
    })),
    fields: target.fields.map(policyFieldToProtoPayload),
    annotations: target.customAnnotations.map(annotationToProtoPayload),
  };
}

function policyFieldToProtoPayload(field: PolicyField) {
  return {
    name: field.name,
    usages: field.allowedUsages.map(usage => {
      let usageType: string = usage.usage;
      if (usageType === '*') {
        usageType = 'Any';
      }
      return {
        usage: convertToProtoEnum(usageType, PolicyFieldUsageEnum),
        redactionLabel: usage.label,
      };
    }),
    subfields: field.subfields.map(policyFieldToProtoPayload),
    annotations: field.customAnnotations.map(annotationToProtoPayload),
  };
}

function policyConfigToProtoPayload(config: PolicyConfig) {
  return {
    name: config.name,
    metadata: mapToDictionary(config.metadata),
  };
}

/**
 * Converts a TypeScript string-valued enum from PascalCase used for TS enum
 * values to UPPER_CAMEL_CASE used for proto enum values.
 */
function convertToProtoEnum<T>(value: T, enumType: protobuf.Enum): number | null {
  if (value == null) {
    return null;
  } else if (typeof value !== 'string') {
    throw new Error(`Enum value must be a string, instead was: ${value}`);
  }
  let str = value as string;
  str = str[0].toUpperCase() + str.slice(1).replace(/([A-Z])/g, '_$1').toUpperCase();
  const protoEnumValue = enumType.values[str];
  if (protoEnumValue == null) {
    throw new Error(`Unknown enum value ${str} for enum ${enumType.name}.`);
  }
  return protoEnumValue;
}
