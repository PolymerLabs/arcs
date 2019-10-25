package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.type.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/type",
            "@maven//:com_google_truth_truth",
            "@maven//:junit_junit",
        ],
    )
    for src_file in glob(["*.kt"])
]
