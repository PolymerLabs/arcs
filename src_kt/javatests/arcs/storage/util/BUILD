load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "util",
    package = "arcs.storage.util",
    deps = [
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/storage:proxy",
        "//src_kt/java/arcs/storage/driver",
        "//src_kt/java/arcs/storage/referencemode",
        "//src_kt/java/arcs/storage/util",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
