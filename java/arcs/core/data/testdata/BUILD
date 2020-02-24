load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_manifest_proto",
    "arcs_proto2plan",
)

licenses(["notice"])

filegroup(
    name = "encoded_manifest",
    srcs = ["example.pb.bin"],
    visibility = ["//visibility:public"],
)

arcs_manifest_proto(
    name = "example",
    src = "Example.arcs",
    visibility = ["//visibility:public"],
)

recipe2plan(
    name = "test_rule",
    srcs = [":manifest_data"],
    package = "arcs.tools.test",
)
