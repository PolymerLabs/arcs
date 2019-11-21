licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

[
    [
        java_test(
            name = src_file[:-3],
            size = "small",
            test_class = "arcs.storage.referencemode.%s" % src_file[:-3],
            runtime_deps = [":%sLib" % src_file[:-3]]
        ),
        kt_jvm_library(
            name = "%sLib" % src_file[:-3],
            srcs = [src_file],
            testonly = True,
            deps = [
                "//src_kt/java/arcs/common",
                "//src_kt/java/arcs/crdt",
                "//src_kt/java/arcs/storage",
                "//src_kt/java/arcs/storage/driver",
                "//src_kt/java/arcs/storage/referencemode",
                "//third_party/java/junit",
                "//third_party/java/truth",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
                "//third_party/kotlin/mockito_kotlin",
            ],
        )
    ]
    for src_file in glob(["*.kt"])
]
