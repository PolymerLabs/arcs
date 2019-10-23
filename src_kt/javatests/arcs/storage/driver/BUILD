package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.storage.driver.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/common",
            "//src_kt/java/arcs/storage",
            "//src_kt/java/arcs/storage/driver",
            "//src_kt/java/arcs/util",
            "@maven//:com_google_truth_truth",
            "@maven//:junit_junit",
            "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core",
        ],
    )
    for src_file in glob(["*.kt"])
]
