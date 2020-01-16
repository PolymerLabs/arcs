load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_native_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
        "jvm/*.kt",
    ]),
)

arcs_kt_native_library(
    name = "arcs-wasm",
    srcs = glob([
        "*.kt",
        "wasm/*.kt",
    ]),
)

# Special package containing wasm srcs for unit testing (on the JVM).
arcs_kt_jvm_library(
    name = "arcs-wasm-testing",
    testonly = 1,
    srcs = glob(["*.kt"]) + [
        "wasm/Encoding.kt",
        "jvm/JvmUtils.kt",
    ],
)
