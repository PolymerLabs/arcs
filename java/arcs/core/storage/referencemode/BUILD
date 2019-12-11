load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "kt_jvm_and_js_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_jvm_and_js_library(
    name = "referencemode",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data:entity",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
