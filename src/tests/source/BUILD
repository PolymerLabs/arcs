load("//build_defs:build_defs.bzl", "arcs_cc_schema")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

package(default_visibility = ["//src/tests:__pkg__"])

filegroup(
    name = "schemas_srcs",
    srcs = ["schemas.arcs"],
)

arcs_cc_schema(
    name = "schemas",
    src = "schemas.arcs",
    out = "entities.h",
)

cc_wasm_binary(
    name = "wasm-particle-old",
    srcs = ["wasm-particle-old.cc"],
    hdrs = ["entities.h"],
    deps = ["//src/wasm/cpp:arcs"],
)

cc_wasm_binary(
    name = "wasm-particle-new",
    srcs = ["wasm-particle-new.cc"],
    hdrs = ["entities.h"],
    deps = ["//src/wasm/cpp:arcs"],
)
