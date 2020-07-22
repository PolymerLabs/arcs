load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "tools",
    srcs = glob(["*Test.kt"]),
    package = "arcs.tools",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/testutil",
        "//java/arcs/tools:generator",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinpoet",
    ],
)
