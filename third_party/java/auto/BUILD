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

java_plugin(
    name = "autoservice_plugin",
    constaints = ["android"],
    processor_class = "com.google.auto.service.processor.AutoServiceProcessor",
    deps = ["@maven//:com_google_auto_service_auto_service"],
)

java_library(
    name = "auto_service_internal",
    constaints = ["android"],
    exported_plugins = [":autoservice_plugin"],
    exports = ["@maven//:com_google_auto_service_auto_service_annotations"],
)

# For some reason, auto_service maven artifacts aren't downloaded if is exported and consumed
# by kt_jvm rules. This dummy forces it by running the compiler and dep'ing on the maven dep.
java_library(
    name = "auto_service",
    srcs = ["Dummy.java"],
    constaints = ["android"],
    # This has to be repeated here and above (unknown, but it doesn't work otherwise)
    exported_plugins = [":autoservice_plugin"],
    deps = [":auto_service_internal"],
)
