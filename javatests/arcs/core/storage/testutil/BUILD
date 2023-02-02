load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "testutil",
    package = "arcs.core.storage.testutil",
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/storage/testutil:fake_driver_provider",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
