load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "storage",
    package = "arcs.core.storage",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data",
        "//java/arcs/core/data/util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/core/type",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)
