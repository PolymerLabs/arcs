load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_manifest_proto",
    "proto2schema",
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

proto2schema(
    name = "example_generation",
    srcs = [":example"],
)
