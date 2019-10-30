"""Arcs manifest bundling rules."""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")

def arcs_manifest(name, srcs, deps = [], visibility = None):
    """Bundles .arcs manifest files with their particle implementations.

    Generates a filegroup that can be included in e.g. an Android assets folder.
    """
    for src in srcs:
        if not src.endswith(".arcs"):
            fail("src must be an .arcs manifest file, found %s" % src)

    # All the files that need to go in the filegroup.
    all_files = srcs + deps

    native.filegroup(
        name = name,
        srcs = all_files,
        visibility = visibility,
    )

    test_args = " ".join(["--src $(location %s)" % src for src in srcs])

    sigh_command(
        name = name + "_test",
        srcs = all_files,
        sigh_cmd = "run manifestChecker " + test_args,
        deps = [name],
        progress_message = "Checking Arcs manifest",
        execute = False,
    )

def _generate_root_manifest_content(label, input_files):
    """Generates the contents for a root manifest for a manifest bundle.

    Args:
      label: the BUILD rule that generated the bundle, e.g. //a/b:c
      input_files: File objects for all the input files in the bundle.
    """
    content = ["// Root manifest generated by %s." % label]
    for input_file in input_files:
        if input_file.basename.endswith(".arcs"):
            content.append("import '%s';" % input_file.short_path)
    return "\n".join(content)

def _arcs_manifest_bundle(ctx):
    name = ctx.label.name
    input_files = ctx.files.deps
    folder = ctx.attr.folder

    # Make sure folder ends with a slash
    if folder:
        folder += "/"

    # Generate root manifest.
    root_manifest_filename = folder + name + ".arcs"
    root_manifest_file = ctx.actions.declare_file(root_manifest_filename)
    ctx.actions.write(
        output = root_manifest_file,
        content = _generate_root_manifest_content(ctx.label, input_files),
    )

    output_files = [root_manifest_file]

    # Make a copy of all of the input files included in deps, preserving their
    # entire relative path within the repo. That is, if this rule is being
    # invoked from //a/b:c, and has dep //d/e:f, then the dep will be copied to
    # bazel-out/.../bin/a/b/d/e/f. This ensures that when something this
    # manifest bundle is included in an Android assets folder, all the relative
    # paths will be preserved inside the assets folder (i.e. assets/d/e/f).
    for input_file in input_files:
        output_relative_path = folder + input_file.short_path
        output_file = ctx.actions.declare_file(output_relative_path)
        ctx.actions.run_shell(
            outputs = [output_file],
            inputs = [input_file],
            command = "cp $1 $2",
            arguments = [
                input_file.path,
                output_file.path,
            ],
        )
        output_files.append(output_file)

    # TODO: Perform dataflow analysis on the resulting root manifest.

    return [DefaultInfo(files = depset(output_files))]

arcs_manifest_bundle = rule(
    implementation = _arcs_manifest_bundle,
    attrs = {
        "deps": attr.label_list(allow_files = True),
        "folder": attr.string(
            default = "arcs",
            doc = """Optional folder/path under which to nest the bundled
            manifest files. Can be empty""",
        ),
    },
    doc = """Bundles up a number of arcs_manifest rules into a single filegroup.

    This lets you include multiple different manifests in, e.g., your Android
    assets folder. Also generates a root manifest which imports all the other
    manifests.
    """,
)
