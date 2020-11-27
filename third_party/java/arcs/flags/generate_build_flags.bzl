"""Rules for generating the BuildFlags class."""

load(":arcs_build_flag.bzl", "apply_flag_overrides")
load(":flags.bzl", "ARCS_BUILD_FLAGS")

_DEFAULT_CLASS_NAME = "BuildFlags"

_DEFAULT_FILE_NAME = "BuildFlags.java"

# Template for real release builds.
_TEMPLATE = """
package arcs.flags;

/**
 * Generated Arcs build flags.
 *
 * {DESCRIPTION}
 */
public class {CLASS} {{
  private {CLASS}() {{}}

{FIELDS}
}}
"""

# Template where flags are not final, and includes a reset() method.
_DEV_MODE_TEMPLATE = """
package arcs.flags;

/**
 * Generated Arcs build flags for unit tests.
 *
 * Use [BuildFlagsRule] to reset flags between test runs.
 */
public class {CLASS} {{
  private {CLASS}() {{}}

  /** Resets flags to their original values. */
  public static void reset() {{
{FIELD_RESETS}
  }}

{FIELDS}
}}
"""

def generate_build_flags(
        name,
        flags = ARCS_BUILD_FLAGS,
        flag_overrides = {},
        class_name = _DEFAULT_CLASS_NAME,
        dev_mode = False):
    """Generates a BuildFlags class using the status of each flag.

    Args:
      name: Label for the build target.
      flags: Optional list of arcs_build_flag definitions (see arcs_build_flag.bzl). Defaults to
          ARCS_BUILD_FLAGS. Only override for testing purposes.
      flag_overrides: Optional dict mapping from flag name to value (boolean). Overrides the default
          value from the flag definition.
      class_name: Optional name for the generated class. Default is BuildFlags.
      dev_mode: Optional boolean indicating whether the generated class is for
          development purposes (e.g. unit tests).
    """
    flag_values = apply_flag_overrides(flags, flag_overrides, dev_mode)

    # Convert boolean flag values to strings.
    flag_value_strings = {}
    for flag_name, flag_value in flag_values.items():
        flag_value_strings[flag_name] = str(flag_value)

    # Nest the output file inside the correct directory structure for its
    # package, and nest that inside a new folder for this build target to avoid
    # collisions with other generated files.
    out = "{name}/arcs/flags/{class_name}.java".format(
        name = name,
        class_name = class_name,
    )

    _generate_build_flags(
        name = name,
        class_name = class_name,
        desc = "Defaults for development. Flags are all set to their default values.",
        flags = flag_value_strings,
        out = out,
        dev_mode = dev_mode,
    )

def _generate_prod_mode_file(class_name, desc, flag_list):
    field_def_template = "  public static final boolean {NAME} = {VALUE};"

    fields = []
    for name, value in flag_list:
        fields.append(field_def_template.format(NAME = name, VALUE = value))

    return _TEMPLATE.format(
        CLASS = class_name,
        DESCRIPTION = desc,
        FIELDS = "\n".join(fields),
    )

def _generate_dev_mode_file(class_name, desc, flag_list):
    field_def_template = "  public static boolean {NAME} = {VALUE};"
    field_reset_template = "    {NAME} = {VALUE};"

    fields = []
    field_resets = []
    for name, value in flag_list:
        fields.append(field_def_template.format(NAME = name, VALUE = value))
        field_resets.append(field_reset_template.format(NAME = name, VALUE = value))

    return _DEV_MODE_TEMPLATE.format(
        CLASS = class_name,
        DESCRIPTION = desc,
        FIELDS = "\n".join(fields),
        FIELD_RESETS = "\n".join(field_resets),
    )

def _generate_build_flags_impl(ctx):
    # List of (name, value) pairs. Flag name in uppercase, flag value (true/false) in lowercase.
    flag_list = [(name.upper(), value.lower()) for name, value in sorted(ctx.attr.flags.items())]

    if ctx.attr.dev_mode:
        content = _generate_dev_mode_file(ctx.attr.class_name, ctx.attr.desc, flag_list)
    else:
        content = _generate_prod_mode_file(ctx.attr.class_name, ctx.attr.desc, flag_list)

    ctx.actions.write(
        output = ctx.outputs.out,
        content = content,
    )

_generate_build_flags = rule(
    implementation = _generate_build_flags_impl,
    attrs = {
        "class_name": attr.string(
            mandatory = True,
            doc = "Name of the class to generate.",
        ),
        "desc": attr.string(
            doc = "Descriptive comment to add to the generated file.",
        ),
        "flags": attr.string_dict(
            mandatory = True,
            doc = "Dict of flags mapping from flag name to value.",
        ),
        "dev_mode": attr.bool(
            doc = "If true, flags are non-final and can be reset.",
        ),
        "out": attr.output(
            mandatory = True,
            doc = "Output .java file created by this rule.",
        ),
    },
)
