package(default_visibility = ["//visibility:public"])

licenses(["notice"])

# With one dependency target (...:kotlin), allow builds for both JVM and Wasm runtimes
alias(
    name = "kotlin",
    actual = "//java/arcs/sdk/jvm:arcs",
)

alias(
    name = "kotlin-wasm",
    actual = "//java/arcs/sdk/wasm:arcs",
)

alias(
    name = "kotlin-common",
    actual = "//java/arcs/sdk/common:arcs",
)
