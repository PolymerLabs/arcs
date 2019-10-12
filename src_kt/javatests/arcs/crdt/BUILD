package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_test")

kt_jvm_test(
    name = "crdt",
    srcs = glob(["**/*.kt"]),
    test_class = "arcs.crdt.AllTests",
    deps = [
        "@maven//:junit_junit",
        "@maven//:com_google_truth_truth",
        "//java/arcs/crdt",
        "//java/arcs/crdt/internal",
    ]
)
