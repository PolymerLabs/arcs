load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_kotlin_native_sha256 = "100920f1a3352846bc5a2990c87cb71f221abf8261251632ad10c6459d962393"
_kotlin_native_version = "1.3.50"

def kotlin_native_repo():
    """Downloads the kotlin-native release and "installs" the kotlinc compiler.

    Kotlin-Native is used to compile Kotlin into Wasm. This rule downloads the latest
    experimental repository and makes the kotlinc compiler available for BUILD rules.
    """
    http_archive(
        name = "kotlin_native",
        url = "https://github.com/JetBrains/kotlin/releases/download/v{0}/kotlin-native-macos-{0}.tar.gz".format(_kotlin_native_version),
        type = "tar.gz",
        build_file = "//build_defs/kotlin-native:kotlinc.BUILD",
    )
