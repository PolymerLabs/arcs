licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

[
    [
        java_test(
            name = src_file[:-3],
            size = "small",
            test_class = "arcs.crdt.%s" % src_file[:-3],
            runtime_deps = [":%sLib" % src_file[:-3]]
        ),
        kt_jvm_library(
            name = "%sLib" % src_file[:-3],
            srcs = [src_file],
            testonly = True,
            deps = [
                "//src_kt/java/arcs/common",
                "//src_kt/java/arcs/crdt",
                "//src_kt/java/arcs/crdt/internal",
                "//src_kt/java/arcs/data",
                "//src_kt/java/arcs/testutil",
                "//third_party/java/junit",
                "//third_party/java/truth",
            ],
        )
    ]
    for src_file in glob(["*.kt"])
]
