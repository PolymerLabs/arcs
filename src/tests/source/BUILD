load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

package(default_visibility = ["//src/tests:__pkg__"])

cc_wasm_binary(
    name = "wasm-particle-old",
    srcs = ["wasm-particle-old.cc"],
    deps = ["//src/wasm/cpp:arcs"],
)

cc_wasm_binary(
    name = "wasm-particle-new",
    srcs = ["wasm-particle-new.cc"],
    deps = ["//src/wasm/cpp:arcs"],
)
