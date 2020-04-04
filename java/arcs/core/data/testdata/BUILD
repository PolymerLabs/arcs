load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)

licenses(["notice"])

filegroup(
    name = "examples",
    srcs = glob(
        ["*"],
        exclude = ["BUILD"],
    ),
    visibility = ["//visibility:public"],
)

arcs_kt_gen(
    name = "example_gen",
    srcs = ["WriterReaderExample.arcs"],
    visibility = ["//visibility:public"],
)
