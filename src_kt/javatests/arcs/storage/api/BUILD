load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "api",
    package = "arcs.storage.api",
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/data",
        "//src_kt/java/arcs/data/util",
        "//src_kt/java/arcs/storage",
        "//src_kt/java/arcs/storage/api",
        "//src_kt/java/arcs/storage/driver",
        "//src_kt/java/arcs/storage/referencemode",
        "//src_kt/java/arcs/type",
        "//src_kt/java/arcs/util",
        "//src_kt/java/arcs/util/testutil",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
