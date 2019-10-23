package(default_visibility = ["//visibility:public"])

licenses(["notice"])

java_library(
    name = "flogger",
    exports = ["@maven//:com_google_flogger_flogger"],
    runtime_deps = ["@maven//:com_google_flogger_flogger_system_backend"],
)

alias(
    name = "android",
    actual = ":flogger",
)
