licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

[
    [
        java_test(
            name = src_file[:-3],
            size = "small",
            test_class = "arcs.storage.util.%s" % src_file[:-3],
            runtime_deps = [":%sLib" % src_file[:-3]]
        ),
        kt_jvm_library(
            name = "%sLib" % src_file[:-3],
            srcs = [src_file],
            testonly = True,
            deps = [
                "//src_kt/java/arcs/crdt/internal",
                "//src_kt/java/arcs/storage:proxy",
                "//src_kt/java/arcs/storage/driver",
                "//src_kt/java/arcs/storage/referencemode",
                "//src_kt/java/arcs/storage/util",
                "//third_party/java/truth",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
            ],
        )
    ]
    for src_file in glob(["*.kt"])
]
