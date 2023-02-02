load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "testutil",
    package = "arcs.core.data.testutil",
    deps = [
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/testutil",
        "//java/arcs/core/data/util:data-util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
