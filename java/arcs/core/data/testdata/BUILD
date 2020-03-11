load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_plan",
    "arcs_manifest_proto",
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

arcs_manifest_proto(
    name = "example",
    src = "Example.arcs",
    visibility = ["//visibility:public"],
)

arcs_kt_plan(
    name = "example_plan",
    src = "WriterReaderExample.arcs",
    visibility = ["//visibility:public"],
)
