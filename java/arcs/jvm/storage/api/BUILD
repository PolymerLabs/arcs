load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_native_library",
    "kt_js_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "api",
    srcs = glob([
        "*.kt",
        "jvm/*.kt",
    ]),
    visibility = ["//visibility:public"],
    exports = [
        "//java/arcs/core/data:rawentity",
    ],
    deps = [
        "//java/arcs/core/storage/api:api-common",
        "//java/arcs/core/storage/handle",
    ],
)
