package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.util.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/util",
            "//third_party/java/junit",
            "//third_party/java/truth",
            "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        ],
    )
    for src_file in glob(
        ["*.kt"],
        exclude = ["Base64PerformanceTest.kt"],
    )
]

kt_jvm_test(
    name = "Base64PerformanceTest",
    size = "medium",
    srcs = ["Base64PerformanceTest.kt"],
    test_class = "arcs.util.Base64PerformanceTest",
    deps = [
        "//src_kt/java/arcs/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
