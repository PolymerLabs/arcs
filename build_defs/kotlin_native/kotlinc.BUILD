_files_without_spaces = [f for f in glob(["**"]) if " " not in f]

filegroup(
    name = "all_files",
    srcs = _files_without_spaces,
    visibility = ["//visibility:public"],
)
