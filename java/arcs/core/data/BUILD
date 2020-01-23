load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "kt_jvm_and_js_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_jvm_and_js_library(
    name = "data",
    srcs = glob(["*.kt"]),
    exports = [
        ":rawentity",
    ],
    deps = [
        ":rawentity",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/type",
    ],
)

kt_jvm_and_js_library(
    name = "rawentity",
    srcs = [
        "FieldName.kt",
        "RawEntity.kt",
    ],
    deps = [
        "//java/arcs/core/common",
    ],
)
