package arcs.flags

import kotlin.reflect.KProperty

/**
 * Common functionality for `BuildFlags` classes generated for dev-mode (i.e. for unit testing, and
 * for test apps). Don't rely on any of these methods being here in release builds. The only things
 * you can access from a `BuildFlags` class in production are the field getters for each flag.
 *
 * Code-generated subclasses should set the [initialFlags] and [requiredFlags] fields appropriately,
 * and then create a field for each flag that delegates to the base class.
 *
 * Example:
 * ```kotlin
 * class BuildFlags : DevModeBuildFlags(
 *   initialFlags = mapOf("SOME_FLAG" to true, "SOME_OTHER_FLAG" to false),
 *   requiredFlags = emptyMap()
 * ) {
 *   val SOME_FLAG: Boolean by this
 *   val SOME_OTHER_FLAG: Boolean by this
 * }
 * ```
 */
abstract class DevModeBuildFlags(
  /**
   * Maps from flag name to default flag value. This gives the complete set of flags that can be
   * used; you cannot add any new flags to the [DevModeBuildFlags] instance after it is first
   * constructed.
   */
  private val initialFlags: Map<String, Boolean>,
  /**
   * Maps from flag name to a list of other flags that that flag requires. It can only be enabled
   * if those flags are enabled first.
   */
  private val requiredFlags: Map<String, List<String>>
) {
  private var flags = initialFlags.toMutableMap()

  init {
    // Check that initial flag values are valid.
    validate()
  }

  /** Returns the value of the given [flag]. */
  operator fun get(flag: String): Boolean {
    checkIsValid(flag)
    return flags.getValue(flag)
  }

  /** Sets the value of the given [flag]. */
  operator fun set(flag: String, value: Boolean) {
    checkIsValid(flag)
    flags[flag] = value
    validate()
  }

  /** Allows code-generated subclasses to delegate to the [get] method. */
  operator fun getValue(thisRef: Any?, property: KProperty<*>): Boolean {
    return this[property.name]
  }

  /** Allows code-generated subclasses to delegate to the [set] method. */
  operator fun setValue(thisRef: Any?, property: KProperty<*>, value: Boolean) {
    this[property.name] = value
  }

  /**
   * Updates multiple flag values at once. Only validates after all values are applied; this lets
   * you set multiple flags at once without worrying about the correct ordering implied by
   * [requiredFlags].
   */
  fun update(newValues: Map<String, Boolean>) {
    newValues.forEach { (flag, value) ->
      checkIsValid(flag)
      flags[flag] = value
    }
    validate()
  }

  /** Resets all flags to their initial values. */
  fun reset() {
    flags = initialFlags.toMutableMap()
    validate()
  }

  /** Verifies that all the [requiredFlags] constraints are met by the current flag values. */
  private fun validate() {
    requiredFlags.forEach { (flag, required) ->
      checkIsValid(flag)
      required.forEach { requiredFlag ->
        checkIsValid(requiredFlag)
        require(!flags.getValue(flag) || flags.getValue(requiredFlag)) {
          "Flag '$flag' requires flag '$requiredFlag' to be enabled."
        }
      }
    }
  }

  private fun checkIsValid(flag: String) {
    require(flag in flags) { "Invalid flag named '$flag'." }
  }
}
