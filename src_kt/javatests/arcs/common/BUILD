package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.common.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/common",
            "//third_party/java/junit",
            "//third_party/java/truth",
        ],
    )
    for src_file in glob(["*.kt"])
]
