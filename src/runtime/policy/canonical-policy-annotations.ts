/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/** Canonical definitions of annotations used for defining policies. */
export const canonicalPolicyAnnotations = `
annotation intendedPurpose(description: Text)
  targets: [Policy]
  retention: Source
  doc: 'Description of a policy.'

annotation egressType(type: Text)
  targets: [Policy]
  retention: Source
  doc: 'Type of egress permitted by a policy. Valid values are: Logging, FederatedAggregation.'

annotation allowedRetention(medium: Text, encryption: Boolean)
  targets: [PolicyTarget]
  retention: Source
  allowMultiple: true
  doc: 'Indicates the conditions under which the target data can be retained. Valid values for the medium are: Ram, Disk. Encryption is not supported yet.'

annotation maxAge(age: Text)
  targets: [PolicyTarget]
  retention: Source
  doc: 'Indicates the maximum age the target data can be in order to be used. Age is a string like "2d". Supported units are minutes ("m"), hours ("h"), days ("d").'

// TODO(b/157961278): Support varargs or dictionaries, and then convert this to
// be: @allowedUsages(raw: [join], someLabel: [egress]).
annotation allowedUsage(label: Text, usageType: Text)
  targets: [PolicyField]
  retention: Source
  allowMultiple: true
  doc: 'Indicates the conditions under which a field can be used. Valid values for usageType are: egress, join, *. "raw" is a special value for label meaning that no redaction is required. The default if no @allowedUsage annotation is supplied is for all usages to be valid.'
`;
