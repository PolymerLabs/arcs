load("@rules_java//java:defs.bzl", "java_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

package(default_visibility = ["//visibility:public"])

kt_jvm_library(
    name = "proto2schema_generator",
    srcs = ["Proto2Schema.kt"],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:manifest_android_proto",
        "//third_party/kotlin/clikt",
        "//third_party/kotlin/kotlinpoet",
    ],
)

java_binary(
    name = "proto2schema",
    main_class = "arcs.core.tools.Proto2SchemaKt",
    runtime_deps = [":proto2schema_generator"],
)
