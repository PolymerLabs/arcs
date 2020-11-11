"""Rules for generating the BuildFlags class."""

load(":arcs_build_flag.bzl", "validate_flag")
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
    flag_statuses = {}
    flag_values = {}

    # Compute default value for each flag based off the flag feature status.
    for flag in flags:
        validate_flag(flag)
        if flag.name in flag_statuses:
            fail("Multiple definitions of flag named '%s'." % flag.name)
        flag_statuses[flag.name] = flag.status

        if dev_mode:
            # Flags are on by default in dev mode, unless flag status is NOT_READY.
            flag_value = (flag.status != "NOT_READY")
        else:
            # Flags are off by default in prod mode, unless flag status is LAUNCHED.
            flag_value = (flag.status == "LAUNCHED")

        flag_values[flag.name] = str(flag_value)

    # Override flag default values based off supplied parameters.
    for flag_name, value in flag_overrides.items():
        if type(value) != "bool":
            fail("Cannot override flag '%s': expected True/False got %s." % (flag_name, value))
        if flag_name not in flag_statuses:
            fail("Cannot override flag '%s': unknown flag name." % flag_name)
        status = flag_statuses[flag_name]
        if status == "NOT_READY":
            fail("Cannot override flag '%s': feature status is NOT_READY." % flag_name)
        if status == "LAUNCHED" and value == False:
            fail(("Cannot override flag '%s' to False: feature status is LAUNCHED. Status must " +
                  "be changed to READY to allow overriding.") % flag_name)
        flag_values[flag_name] = str(value)

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
        flags = flag_values,
        out = out,
        dev_mode = dev_mode,
    )

def _generate_build_flags_impl(ctx):
    if ctx.attr.dev_mode:
        file_template = _DEV_MODE_TEMPLATE
        field_def_template = "  public static boolean {NAME} = {VALUE};"
        field_reset_template = "    {NAME} = {VALUE};"
    else:
        file_template = _TEMPLATE
        field_def_template = "  public static final boolean {NAME} = {VALUE};"
        field_reset_template = ""

    # Generate boolean constants.
    fields = []
    field_resets = []
    for flag_name, flag_value in sorted(ctx.attr.flags.items()):
        name = flag_name.upper()
        value = flag_value.lower()

        line = field_def_template.format(NAME = name, VALUE = value)
        fields.append(line)

        if ctx.attr.dev_mode:
            field_resets.append(
                field_reset_template.format(NAME = name, VALUE = value),
            )

    # Write file.
    content = file_template.format(
        CLASS = ctx.attr.class_name,
        DESCRIPTION = ctx.attr.desc,
        FIELDS = "\n".join(fields),
        FIELD_RESETS = "\n".join(field_resets),
    )
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
