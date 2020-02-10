load("@rules_java//java:defs.bzl", "java_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "schema2wasm_srcs",
    srcs = glob(["schema2*.ts"]),
)

filegroup(
    name = "all_srcs",
    srcs = glob(["**"]),
)

kt_jvm_library(
    name = "generator",
    srcs = ["Recipe2Plan.kt"],
    deps = [
        "//third_party/kotlin/clikt",
        "//third_party/kotlin/kotlinpoet",
        "//third_party/java/json"
    ],
)

java_binary(
    name = "recipe2plan",
    main_class = "arcs.tools.Recipe2PlanKt",
    runtime_deps = [":generator"],
)
