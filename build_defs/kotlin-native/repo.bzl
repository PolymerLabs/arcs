load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_kotlin_native_sha256 = "100920f1a3352846bc5a2990c87cb71f221abf8261251632ad10c6459d962393"
_kotlin_native_version = "1.3.50"

MACOS_DEPENDENCIES = [
    ("clang-llvm-6.0.1-darwin-macos", "21b1bfb5d11c07aad7627c121b323202da257ed2276afa6942d4086ab393509a"),
    ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
    ("libffi-3.2.1-3-darwin-macos", "b83357b2d4ad4be9d5466ac3cbf12570928d84109521ab687672ec8ef47d9edc"),
    ("target-toolchain-3-macos-wasm", "21841134a97e287507d426b1ce767a55416ef4b639ca88b691f125185600ea3d")
  ]


def kotlin_native_repo():
    """Downloads the kotlin-native release and "installs" the kotlinc compiler.

    Kotlin-Native is used to compile Kotlin into Wasm. This rule downloads the latest
    experimental repository and makes the kotlinc compiler available for BUILD rules.
    """
    http_archive(
        name = "kotlin_native",
        url = "https://github.com/JetBrains/kotlin/releases/download/v{0}/kotlin-native-macos-{0}.tar.gz".format(_kotlin_native_version),
        type = "tar.gz",
        sha256 = _kotlin_native_sha256,
        build_file = "//build_defs/kotlin-native:kotlinc.BUILD",
    )


    [http_archive(
        name = x,
        urls = ["https://bintray.com/jetbrains/kotlin-native-dependencies/download_file?file_path={0}.tar.gz".format(x)],
        type = "tar.gz",
        sha256 = sha,
        build_file = "//build_defs/kotlin-native:konan.BUILD",
    ) for x, sha in MACOS_DEPENDENCIES]

