load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "entity",
    srcs = glob(["*.kt"]),
    package = "arcs.core.entity",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
