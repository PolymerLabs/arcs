load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "host",
    srcs = glob(["*Test.kt"]),
    package = "arcs.core.host",
    deps = [
        ":particle",  # buildcleaner: keep
        "//java/arcs/core/host",
        "//java/arcs/jvm/host",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "person.arcs",
        "test.arcs",
    ],
    package = "arcs.core.host",
)

arcs_kt_jvm_library(
    name = "particle",
    srcs = glob(
        ["*.kt"],
        exclude = ["*Test.kt"],
    ),
    deps = [
        ":schemas",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//third_party/java/auto:auto_service",
    ],
)
