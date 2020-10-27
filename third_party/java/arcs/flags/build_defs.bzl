"""Rules for defining Arcs build flags and generating the BuildFlags class."""

_DEFAULT_CLASS_NAME = "BuildFlags"

_DEFAULT_FILE_NAME = "BuildFlags.java"

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

def arcs_build_flag(name, desc, bug_id, default_value):
    """Defines an Arcs build flag for a new feature.

    Args:
      name: The name of the feature. Should be lower_snake_case.
      desc: A short description of the feature.
      bug_id: A bug ID of the form "b/123456" for documentation purposes, or a
          string explaining why one is not needed.
      default_value: The default value to use for this flag in dev builds.
          Either True or False.

    Returns:
      A struct containing the build flag data.
    """
    if bug_id == None:
        fail("bug_id must be provided.")
    if desc == None:
        fail("desc must be provided.")
    return struct(
        name = name,
        desc = desc,
        bug_id = bug_id,
        default_value = default_value,
    )

def generate_default_build_flags(
        name,
        flags,
        class_name = _DEFAULT_CLASS_NAME,
        out = _DEFAULT_FILE_NAME):
    """Generates a BuildFlags class using the default values for each flag.

    Args:
      name: Label for the build target.
      flags: List of arcs_build_flag definitions.
      class_name: Optional name for the generated class. Default is BuildFlags.
      out: Optional name for the generated file. Default is BuildFlags.java.
    """
    flag_dict = {}
    for flag in flags:
        flag_dict[flag.name] = str(flag.default_value)

    if not out.endswith(".java"):
        fail("Output file must be a .java file.")

    _generate_build_flags(
        name = name,
        class_name = class_name,
        desc = "Defaults for development. Flags are all set to their default values.",
        flags = flag_dict,
        out = out,
    )

def _generate_build_flags_impl(ctx):
    # Generate boolean constants.
    fields = []
    for flag_name, flag_value in sorted(ctx.attr.flags.items()):
        line = "  public static boolean {} = {};".format(flag_name.upper(), flag_value.lower())
        fields.append(line)

    # Write file.
    content = _TEMPLATE.format(
        CLASS = ctx.attr.class_name,
        DESCRIPTION = ctx.attr.desc,
        FIELDS = "\n".join(fields),
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
        "out": attr.output(
            mandatory = True,
            doc = "Output .java file created by this rule.",
        ),
    },
)
