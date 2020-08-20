load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_cc_schema",
    "arcs_manifest",
    "arcs_manifest_bundle",
)
load(
    "//third_party/java/arcs/build_defs/emscripten:build_defs.bzl",
    "cc_wasm_binary",
)

licenses(["notice"])

arcs_cc_schema(
    name = "example_schema",
    src = "example.arcs",
    out = "example.h",
)

cc_wasm_binary(
    name = "example_particle",
    srcs = ["example.cc"],
    hdrs = ["example.h"],
    deps = ["//src/wasm/cpp:arcs"],
)

arcs_manifest(
    name = "example_manifest",
    srcs = ["example.arcs"],
    deps = [":example_particle"],
)

arcs_manifest_bundle(
    name = "bundle",
    visibility = ["//visibility:public"],
    deps = [
        ":example_manifest",
    ],
)
