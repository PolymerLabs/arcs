load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_plan",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "host",
    srcs = glob(["*Test.kt"]),
    package = "arcs.sdk",
    deps = [
        ":particle",  # buildcleaner: keep
        ":schemas",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk:sdk-kt",
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
    ],
)

arcs_kt_plan(
    name = "plans",
    srcs = [
        "person.arcs",
    ],
    deps = [
        ":schemas",
    ],
)

arcs_kt_jvm_library(
    name = "particle",
    testonly = 1,
    srcs = glob(
        ["*.kt"],
        exclude = ["*Test.kt"],
    ),
    deps = [
        ":plans",
        ":schemas",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
