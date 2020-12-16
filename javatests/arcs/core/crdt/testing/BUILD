load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "testing",
    package = "arcs.core.crdt.testing",
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testing",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
