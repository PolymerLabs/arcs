load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["expression.arcs"],
)

arcs_kt_android_test_suite(
    name = "tests",
    size = "medium",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.showcase.expression",
    deps = [
        ":codegen",
        "//java/arcs/core/data",
        "//java/arcs/core/data/expression",
        "//java/arcs/core/data/expression:particle",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//javatests/arcs/showcase",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
