/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.policy.builder

import arcs.core.data.Annotation
import arcs.core.data.FieldName
import arcs.core.data.builder.AnnotationBuilder
import arcs.core.data.builder.DataDsl
import arcs.core.policy.Policy
import arcs.core.policy.PolicyConfig
import arcs.core.policy.PolicyField
import arcs.core.policy.PolicyRetention
import arcs.core.policy.PolicyTarget
import arcs.core.policy.StorageMedium
import arcs.core.policy.UsageType

/**
 * Builds a [Policy] with the supplied [name] and [egressType], using a [PolicyBuilder].
 *
 * Example:
 *
 * ```kotlin
 * val myPolicy = policy("MyPolicy", "Analytics") {
 *   description =
 *     """
 *     Policy describing valid usage of Foos and Bars when publishing statistics to cloud-based
 *     analytics.
 *     """.trimIndent()
 *
 *   config("AnalyticsServer") {
 *     "url" to "https://mypolicyanalytics.com/stats"
 *   }
 *
 *   target("Foo") {
 *     maxAgeMillis = Duration.ofDays(5).toMillis()
 *
 *     retention(StorageMedium.DISK, encryptionRequired = true)
 *     retention(StorageMedium.RAM, encryptionRequired = false)
 *
 *     "age" to { rawUsage(UsageType.ANY) }
 *     "parents" to {
 *       "mother.firstName" to { rawUsage(UsageType.ANY) }
 *       "father.firstName" to { rawUsage(UsageType.ANY) }
 *     }
 *     "address" to {
 *       "latitude" to {
 *         rawUsage(UsageType.JOIN)
 *         conditionalUsage("citylevelAccuracy", UsageType.EGRESS)
 *       }
 *       "longitude" to {
 *         rawUsage(UsageType.JOIN)
 *         conditionalUsage("citylevelAccuracy", UsageType.EGRESS)
 *       }
 *     }
 *   }
 *
 *   target("Bar") {
 *     maxAgeMillis = Duration.ofHours(6).toMillis()
 *
 *     retention(StorageMedium.RAM, encryptionRequired = false)
 *
 *     "bestFriend.name" to { conditionalUsage("mangled", UsageType.ANY) }
 *   }
 * }
 * ```
 */
fun policy(name: String, egressType: String, block: PolicyBuilder.() -> Unit = {}): Policy =
  PolicyBuilder(name, egressType).apply(block).build()

/**
 * Builds a [PolicyTarget] with the supplied [schemaName], using a [PolicyTargetBuilder].
 *
 * See [policy] for an example.
 */
fun target(schemaName: String, block: PolicyTargetBuilder.() -> Unit = {}): PolicyTarget =
  PolicyTargetBuilder(schemaName).apply(block).build()

/** Builder of [Policy] instances. */
@DataDsl
class PolicyBuilder internal constructor(
  private val name: String,
  private val egressType: String
) {
  /** Human-readable description of the policy. */
  var description: String = ""
  private val targets = mutableListOf<PolicyTarget>()
  private val configs = mutableMapOf<String, PolicyConfig>()

  /** Adds a [PolicyTarget] to the [Policy] being built. */
  fun target(schemaName: String, block: PolicyTargetBuilder.() -> Unit): PolicyTarget =
    PolicyTargetBuilder(schemaName).apply(block).build().also(targets::add)

  /** Adds a [PolicyConfig] block to the [Policy] being built. */
  fun config(configName: String, block: PolicyConfigBuilder.() -> Unit): PolicyConfig =
    PolicyConfigBuilder().apply(block).build().also { configs[configName] = it }

  /** Builds the [Policy]. */
  fun build(): Policy = Policy(
    name = name,
    egressType = egressType,
    description = description,
    targets = targets,
    configs = configs
  )
}

/** Builder of [PolicyTarget] instances. */
@DataDsl
class PolicyTargetBuilder internal constructor(
  private val schemaName: String
) {
  /** The maximum allowable age of the entities being targeted. */
  var maxAgeMillis: Long = 0

  private val retentions = mutableSetOf<PolicyRetention>()
  private val fields = mutableSetOf<PolicyField>()
  private val annotations = mutableSetOf<Annotation>()

  /** Adds an existing [Annotation] object to the [PolicyTarget] being built. */
  fun add(annotation: Annotation): PolicyTargetBuilder = apply { annotations.add(annotation) }

  /** Adds a new [PolicyRetention] object to the [PolicyTarget] being built. */
  fun retention(medium: StorageMedium, encryptionRequired: Boolean): PolicyRetention =
    PolicyRetention(medium, encryptionRequired).also(retentions::add)

  /**
   * Adds a [PolicyField] to the [PolicyTarget] being built, with the receiving string as the
   * dot-delimited access path of the field.
   *
   * Example:
   *
   * ```kotlin
   * target("Person") {
   *   "name" to { rawUsage(UsageType.ANY) }
   *   "bestFriend.name" to { rawUsage(UsageType.JOIN) }
   * }
   * ```
   */
  infix fun String.to(block: PolicyFieldBuilder.() -> Unit): PolicyField =
    PolicyFieldBuilder(this.split(".")).apply(block).build().also(fields::add)

  /** Adds a new [Annotation] to the [PolicyTarget] being built. */
  fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
    AnnotationBuilder(name).apply(block).build().also(::add)

  /** Builds the [PolicyTarget]. */
  fun build(): PolicyTarget = PolicyTarget(
    schemaName = schemaName,
    maxAgeMs = maxAgeMillis,
    retentions = retentions.toList(),
    fields = fields.toList(),
    annotations = annotations.toList()
  )
}

/** Builder of [PolicyField] instances. */
@DataDsl
class PolicyFieldBuilder(private val fieldPath: List<FieldName>) {
  private val rawUsages = mutableSetOf<UsageType>()
  private val redactedUsages = mutableMapOf<String, Set<UsageType>>()
  private val subFields = mutableSetOf<PolicyField>()
  private val annotations = mutableSetOf<Annotation>()

  /** Adds [UsageType]s as raw-usage affordances. */
  fun rawUsage(vararg usageTypes: UsageType): PolicyFieldBuilder =
    apply { rawUsages.addAll(usageTypes) }

  /**
   * Adds [UsageType]s as affordances, if and only if the [requiredLabel] is present on the field.
   */
  fun conditionalUsage(
    requiredLabel: String,
    vararg usageTypes: UsageType
  ): PolicyFieldBuilder = apply {
    redactedUsages[requiredLabel] = (redactedUsages[requiredLabel] ?: emptySet()) + usageTypes
  }

  /** Adds a pre-existing [Annotation]. */
  fun add(annotation: Annotation): PolicyFieldBuilder = apply { annotations.add(annotation) }

  /** Adds a new sub-field to the [PolicyField] being built. */
  infix fun String.to(block: PolicyFieldBuilder.() -> Unit): PolicyField =
    PolicyFieldBuilder(fieldPath + this.split(".")).apply(block).build().also(subFields::add)

  /** Adds a new [Annotation] to the [PolicyField] being built. */
  fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
    AnnotationBuilder(name).apply(block).build().also(this::add)

  /** Builds the [PolicyField]. */
  fun build(): PolicyField = PolicyField(
    fieldPath = fieldPath,
    rawUsages = rawUsages,
    redactedUsages = redactedUsages,
    subfields = subFields.toList(),
    annotations = annotations.toList()
  )
}

/** Builder of [PolicyConfig] maps. */
@DataDsl
class PolicyConfigBuilder {
  private val backingMap = mutableMapOf<String, String>()

  /** Adds a key-value pair to the [PolicyConfig] being built. */
  infix fun String.to(value: String) {
    backingMap[this] = value
  }

  /** Builds the [PolicyConfig]. */
  fun build(): PolicyConfig = backingMap
}
