package(default_visibility = ["//visibility:public"])

# Standalone deps of Java libraries and plugins
java_plugin(
    name = "autovalue_plugin",
    processor_class = "com.google.auto.value.processor.AutoValueProcessor",
    deps = ["@autovalue//jar"],
)

java_library(
    name = "autovalue",
    exported_plugins = [":autovalue_plugin"],
    neverlink = 1,  # Only used at compilation rather than at run-time.
    exports = ["@autovalue_annotations//jar"],
)
