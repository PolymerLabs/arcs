package(default_visibility = ["//visibility:public"])

licenses(["notice"])

# With one dependency target (...:kotlin), allow builds for both JVM and Wasm runtimes
alias(
    name = "kotlin",
    actual = "//src/wasm/kotlin/java/arcs:arcs",
)

alias(
    name = "kotlin-wasm",
    actual = "//src/wasm/kotlin/java/arcs:arcs-wasm",
)
