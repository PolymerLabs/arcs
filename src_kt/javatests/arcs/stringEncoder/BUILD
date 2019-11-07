package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_test")
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

[
    kt_jvm_test(
        name = src_file[:-3],
        size = "small",
        srcs = [src_file],
        test_class = "arcs.stringEncoder.%s" % src_file[:-3],
        deps = [
            "//src/wasm/kotlin:arcs",
            "//third_party/java/junit",
            "//third_party/java/truth",
            "//third_party/kotlin/kotlinx/kotlinx_coroutines",
            "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
        ],
    )
    for src_file in glob(["*.kt"])
]
