package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        srcs = [src_file],
        test_class = "arcs.android.accelerator.%s" % src_file[:-3],
        deps = [
            "@maven//:junit_junit",
            "@maven//:com_google_truth_truth",
            "//javaharness/java/arcs/android/accelerator"
        ]
    ) for src_file in glob(["*.kt"])
]

