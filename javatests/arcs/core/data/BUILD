load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "data",
    data = ["//java/arcs/core/data/testdata:examples"],
    package = "arcs.core.data",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:recipe_java_proto",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/repoutils",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
