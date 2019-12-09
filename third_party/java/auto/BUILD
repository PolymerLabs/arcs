load("@rules_java//java:defs.bzl", "java_library", "java_plugin")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

java_plugin(
    name = "autovalue_plugin",
    processor_class = "com.google.auto.value.processor.AutoValueProcessor",
    deps = ["@maven//:com_google_auto_value_auto_value"],
)

java_library(
    name = "auto_value",
    exported_plugins = [":autovalue_plugin"],
    neverlink = 1,  # Only used at compilation rather than at run-time.
    exports = ["@maven//:com_google_auto_value_auto_value_annotations"],
)
