package(default_visibility = ["//visibility:public"])

licenses(["notice"])

# Standalone deps of Java libraries and plugins
java_plugin(
    name = "autovalue_plugin",
    processor_class = "com.google.auto.value.processor.AutoValueProcessor",
    deps = ["@maven//:com_google_auto_value_auto_value"],
)

java_library(
    name = "autovalue",
    exported_plugins = [":autovalue_plugin"],
    neverlink = 1,  # Only used at compilation rather than at run-time.
    exports = ["@maven//:com_google_auto_value_auto_value_annotations"],
)

java_plugin(
    name = "dagger_compiler",
    generates_api = 1,
    processor_class = "dagger.internal.codegen.ComponentProcessor",
    deps = [
        "@maven//:com_google_dagger_dagger_compiler",
    ],
)
