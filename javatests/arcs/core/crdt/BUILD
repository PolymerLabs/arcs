load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "crdt",
    srcs = glob(["*Test.kt"]),
    package = "arcs.core.crdt",
    deps = [
        ":crdt-test-util",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testutil:generators",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/testutil",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/flags/testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)

arcs_kt_jvm_library(
    name = "crdt-test-util",
    testonly = 1,
    srcs = [
        "CrdtInvariants.kt",
    ],
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//third_party/java/truth:truth-android",
    ],
)
