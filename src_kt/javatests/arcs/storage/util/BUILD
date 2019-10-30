package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_test")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.storage.util.%s" % src_file[:-3],
        deps = [
            "//src_kt/java/arcs/crdt/internal",
            "//src_kt/java/arcs/storage/util",
            "//third_party/java/truth",
            "//third_party/kotlin/kotlinx/kotlinx_coroutines",
            "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
        ],
    )
    for src_file in glob(["*.kt"])
]
