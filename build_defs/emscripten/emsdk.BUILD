# BUILD file to use for the emsdk git repo. This just makes the contents of the
# emsdk repo available to use by Bazel.

# Ignore files with spaces, they cause issues (and probably aren't actually
# needed).
_files_without_spaces = [f for f in glob(["**"]) if " " not in f]

filegroup(
    name = "all_files",
    srcs = _files_without_spaces,
    visibility = ["//visibility:public"],
)
