load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "api",
    package = "arcs.core.storage.api",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/storage:driver",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/jvm/storage/database/testutil",
        "//third_party/java/junit",
        "//third_party/java/truth",
    ],
)
