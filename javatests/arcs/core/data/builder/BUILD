load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "builder",
    srcs = glob(["*.kt"]),
    package = "arcs.core.data.builder",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:annotations",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/builder",
        "//java/arcs/core/data/expression",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
