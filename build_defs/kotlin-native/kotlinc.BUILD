# BUILD file to use for the emsdk git repo. This just makes the contents of the
# emsdk repo available to use by Bazel.

filegroup(
    name = "kotlinc_all",
    srcs = [f for f in glob(["cmd/**"])],
    visibility = ["//visibility:public"],
)

filegroup(
    name = "kotlinc",
    srcs = [
        glob(["cmd/run_konan*"]),
        glob(["cmd/konanc*"]),
        glob(["cmd/kotlinc*"]),
    ],
    visibility = ["//visibility:public"],
)
