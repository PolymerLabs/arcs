load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "referencemode",
    package = "arcs.core.storage.referencemode",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)
