package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.common.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/common",
            "@maven//:com_google_truth_truth",
            "@maven//:junit_junit",
        ],
    )
    for src_file in glob(["*.kt"])
]
