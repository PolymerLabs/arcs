load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "proto",
    data = ["//java/arcs/core/data/testdata:examples"],
    package = "arcs.core.data.proto",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/data/proto:recipe_java_proto",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/repoutils",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
