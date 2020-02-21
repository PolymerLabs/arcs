load("@rules_java//java:defs.bzl", "java_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

package(default_visibility = ["//visibility:public"])

kt_jvm_library(
    name = "generator",
    srcs = ["Recipe2Plan.kt"],
    deps = [
        "//java/arcs/core/data",
        "//third_party/java/gson",
        "//third_party/kotlin/clikt",
        "//third_party/kotlin/kotlinpoet",
    ],
)

java_binary(
    name = "recipe2plan",
    main_class = "arcs.core.tools.Recipe2PlanKt",
    runtime_deps = [":generator"],
)
