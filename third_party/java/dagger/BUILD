load("@rules_java//java:defs.bzl", "java_library", "java_plugin")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

java_library(
    name = "dagger",
    exported_plugins = [":dagger_compiler"],
    exports = ["@maven//:com_google_dagger_dagger"],
)

java_plugin(
    name = "dagger_compiler",
    generates_api = 1,
    processor_class = "dagger.internal.codegen.ComponentProcessor",
    deps = [
        "@maven//:com_google_dagger_dagger_compiler",
    ],
)
