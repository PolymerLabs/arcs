licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

[
    [
        java_test(
            name = src_file[:-3],
            size = "small",
            test_class = "arcs.util.%s" % src_file[:-3],
            runtime_deps = [":%sLib" % src_file[:-3]]
        ),
        kt_jvm_library(
            name = "%sLib" % src_file[:-3],
            srcs = [src_file],
            testonly = True,
            deps = [
                "//src_kt/java/arcs/testutil",
                "//src_kt/java/arcs/util",
                "//third_party/java/junit",
                "//third_party/java/truth",
                "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
            ],
        )
    ]
    for src_file in glob(
        ["*.kt"],
        exclude = ["Base64PerformanceTest.kt"],
    )
]


java_test(
    name = "Base64PerformanceTest",
    size = "small",
    test_class = "arcs.util.Base64PerformanceTest",
    runtime_deps = [":Base64PerformanceTestLib"]
)

kt_jvm_library(
    name = "Base64PerformanceTestLib",
    srcs = ["Base64PerformanceTest.kt"],
    deps = [
        "//src_kt/java/arcs/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
