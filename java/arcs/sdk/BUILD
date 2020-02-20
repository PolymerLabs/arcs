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
    visibility = ["//visibility:public"],
    exports = [
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
    ],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
    ],
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
    srcs = [
        # Don't depend on anything else from the sdk package.
        "UtilsInterface.kt",
    ] + glob([
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
