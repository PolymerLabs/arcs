"""Rules for defining Arcs build flags and generating the BuildFlags class."""

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

# Set of valid values for flag definitions.
_FEATURE_STATUSES = [
    # Flag is disabled by default, and must be manually overridden, e.g. in feature-specific unit
    # tests, and should not be launched in client releases yet. Features that are still under
    # development and that don't work end-to-end yet should be set to NOT_READY.
    "NOT_READY",

    # Flag is enabled for development Arcs builds, and is ready to be enabled for individual client
    # release builds on an opt-in basis. Features that are fully working end-to-end and are ready to
    # start rolling out in client builds should be marked READY.
    "READY",

    # Flag is fully launched in all clients. Can still be disabled by clients if necessary, but
    # shouldn't be. Features which are fully working and have been rolled out to production should
    # be marked LAUNCHED. The expectation is that features marked as LAUNCHED will be cleaned up
    # imminently and their flags removed.
    "LAUNCHED",
]

def arcs_build_flag(name, desc, bug_id, status):
    """Defines an Arcs build flag for a new feature.

    Args:
      name: The name of the feature. Should be lower_snake_case.
      desc: A short description of the feature.
      bug_id: A bug ID of the form "b/123456" for documentation purposes, or a
          string explaining why one is not needed.
      status: The status of this feature flag. Value must be one of _FEATURE_STATUSES.

    Returns:
      A struct containing the build flag data.
    """
    flag = struct(
        name = name,
        desc = desc,
        bug_id = bug_id,
        status = status,
    )
    _validate_flag(flag)
    return flag

def _validate_flag(flag):
    if type(flag.name) != "string":
        fail("Flag name must be a string: %s" % flag.name)
    if flag.name == "":
        fail("Flag name must not be empty.")
    if flag.bug_id == None:
        fail("bug_id must be provided for flag '%s'." % flag.name)
    if flag.desc == None:
        fail("desc must be provided for flag '%s'." % flag.name)
    if flag.status not in _FEATURE_STATUSES:
        fail("Flag '{name}' has status '{status}', but must be one of: {status_list}".format(
            name = flag.name,
            status = flag.status,
            status_list = ", ".join(_FEATURE_STATUSES),
        ))

def generate_build_flags(
        name,
        flags,
        class_name = _DEFAULT_CLASS_NAME,
        dev_mode = False):
    """Generates a BuildFlags class using the status of each flag.

    Args:
      name: Label for the build target.
      flags: List of arcs_build_flag definitions.
      class_name: Optional name for the generated class. Default is BuildFlags.
      dev_mode: Optional boolean indicating whether the generated class is for
          development purposes (e.g. unit tests).
    """
    flag_dict = {}
    for flag in flags:
        _validate_flag(flag)
        if dev_mode:
            # Flags are on by default in dev mode, unless flag status is NOT_READY.
            flag_value = (flag.status != "NOT_READY")
        else:
            # Flags are off by default in prod mode, unless flag status is LAUNCHED.
            flag_value = (flag.status == "LAUNCHED")

        # TODO(b/171530579): Pass in flag overrides and check that they are compatible with the flag
        # status.
        flag_dict[flag.name] = str(flag_value)

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
        flags = flag_dict,
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
