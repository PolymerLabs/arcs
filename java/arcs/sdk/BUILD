load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_native_library",  # @unused
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

# TODO: Re-enable wasm.
# arcs_kt_native_library(
#     name = "sdk-wasm",
#     srcs = glob([
#         "*.kt",
#         "wasm/*.kt",
#     ]),
# )

# Special package containing wasm srcs for unit testing (on the JVM).
arcs_kt_jvm_library(
    name = "sdk-wasm-testing",
    testonly = 1,
    srcs = glob(["*.kt"]) + [
        "wasm/Encoding.kt",
        "jvm/Utils.kt",
    ],
)
