load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_native_library",
    "kt_js_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "sdk",
    srcs = glob([
        "*.kt",
        "jvm/*.kt",
    ]),
)

kt_js_library(
    name = "sdk-js",
    srcs = glob([
        "*.kt",
        "js/*.kt",
    ]),
)

arcs_kt_native_library(
    name = "sdk-wasm",
    srcs = glob([
        "*.kt",
        "wasm/*.kt",
    ]),
)

# Special package containing wasm srcs for unit testing (on the JVM).
arcs_kt_jvm_library(
    name = "sdk-wasm-testing",
    testonly = 1,
    srcs = glob(["*.kt"]) + [
        "wasm/Encoding.kt",
        "jvm/Utils.kt",
    ],
)
