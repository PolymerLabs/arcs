package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        srcs = [src_file],
        test_class = "arcs.crdt.%s" % src_file[:-3],
        deps = [
            "@maven//:junit_junit",
            "@maven//:com_google_truth_truth",
            "//java/arcs/crdt",
            "//java/arcs/crdt/internal",
        ]
    ) for src_file in glob(["*.kt"])
]
