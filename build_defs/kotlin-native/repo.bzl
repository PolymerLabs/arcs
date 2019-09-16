load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_kotlin_native_sha256 = "ff44126d6bfd0ac08305f2615b2c0cdd4b60f8406e4dec6d2389897e0231bf3f"
_kotlin_native_version = "v1.3.50-release-11850"

def kotlin_native_repo():
    """Downloads the kotlin-native release and "installs" the kotlinc compiler.

    Kotlin-Native is used to compile Kotlin into Wasm. This rule downloads the latest
    experimental repository and makes the kotlinc compiler available for BUILD rules.
    """
    http_archive(
        name = "kotlin_native",
        urls = ["https://github.com/JetBrains/kotlin-native/archive/" + _kotlin_native_version + ".zip"],
        sha256 = _kotlin_native_sha256,
        build_file = "//build_defs/kotlin-native:kotlinc.BUILD",
    )
