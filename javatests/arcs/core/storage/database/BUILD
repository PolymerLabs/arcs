load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "database",
    package = "arcs.core.storage.database",
    deps = [
        "//java/arcs/core/analytics",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/jvm/storage/database/testutil",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)
