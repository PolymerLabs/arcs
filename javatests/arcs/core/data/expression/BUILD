load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["EvaluatorParticleTest.arcs"],
    test_harness = True,
)

arcs_kt_jvm_test_suite(
    name = "expression",
    package = "arcs.core.data.expression",
    deps = [
        ":codegen",
        ":codegen_schema_test_harness",
        "//java/arcs/core/data",
        "//java/arcs/core/data/expression",
        "//java/arcs/core/data/expression:particle",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/core/util/testutil",
        "//java/arcs/sdk/testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
