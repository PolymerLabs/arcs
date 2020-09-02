load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "codegen",
    srcs = ["ComputePeopleStats.arcs"],
    test_harness = True,
)

arcs_kt_jvm_library(
    name = "particle",
    srcs = ["ComputePeopleStats.kt"],
    deps = [
        ":codegen",
        "//java/arcs/core/util",
        "//java/arcs/sdk",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_jvm_test_suite(
    name = "test",
    srcs = glob(["*Test.kt"]),
    package = "arcs.showcase.unittesting",
    deps = [
        ":codegen",
        ":codegen_test_harness",
        ":particle",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util/testutil",
        "//java/arcs/sdk",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
