KOTLIN_NATIVE_VERSION = "1.3.50"

_repo_tmpl = KOTLIN_NATIVE_VERSION.join([
    "https://github.com/JetBrains/kotlin/releases/download/v",
    "/kotlin-native-{platform}-",
    ".{ext}",
])

_WINDOWS_DEPENDENCIES = {
    "libffi-3.2.1": ("libffi-3.2.1-mingw-w64-x86-64", "2047faedec4ca6bc074e12642ecf3a14545cbb248224ef3637965714d7e7ea5f"),
    "clang-llvm-6.0.1": ("libffi-3.2.1-mingw-w64-x86-64", "2047faedec4ca6bc074e12642ecf3a14545cbb248224ef3637965714d7e7ea5f"),
    "target-toolchain-wasm": ("target-toolchain-1-mingw-wasm", "b0e814436eafa9f4971696ecdbbf23a34185500085d6257c46464ef69561101d"),
    "target-sysroot-wasm": ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
}

_MACOS_DEPENDENCIES = {
    "libffi-3.2.1": ("libffi-3.2.1-3-darwin-macos", "b83357b2d4ad4be9d5466ac3cbf12570928d84109521ab687672ec8ef47d9edc"),
    "clang-llvm-6.0.1": ("clang-llvm-6.0.1-darwin-macos", "21b1bfb5d11c07aad7627c121b323202da257ed2276afa6942d4086ab393509a"),
    "target-toolchain-wasm": ("target-toolchain-3-macos-wasm", "21841134a97e287507d426b1ce767a55416ef4b639ca88b691f125185600ea3d"),
    "target-sysroot-wasm": ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
}

_LINUX_DEPENDENCIES = {
    "libffi-3.2.1": ("libffi-3.2.1-2-linux-x86-64", "5608bd3845f28151265ec38554763c32b05fe1c8b53dcd7eef9362c919a13b67"),
    "clang-llvm-6.0.1": ("clang-llvm-6.0.1-linux-x86-64", "93a23e63cbf16bf24cbc52e9fef1291be5c4796559d90f3918c3c149ee8582bf"),
    "target-toolchain-wasm": ("target-toolchain-2-linux-wasm", "d5cd155377b3a389430303972ff0f85b9550895b7b088a26fb9c51cb8538387c"),
    "target-sysroot-wasm": ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
}

PLATFORMS = {
    "windows": {
        "platform": "windows",
        "ext": "zip",
        "deps": _WINDOWS_DEPENDENCIES,
        "sha": "2eed825696fcae19c49d3a32ee5a43971dd4992c2ce99a9a2be6e88334bcf875",
    },
    "macos": {
        "platform": "macos",
        "ext": "tar.gz",
        "deps": _MACOS_DEPENDENCIES,
        "sha": "100920f1a3352846bc5a2990c87cb71f221abf8261251632ad10c6459d962393",
    },
    "linux": {
        "platform": "linux",
        "ext": "tar.gz",
        "deps": _LINUX_DEPENDENCIES,
        "sha": "15eb0589aef8dcb435e4cb04ef9a3ad90b8d936118b491618a70912cef742874",
    },
}

def to_platform(os_name):
    """Convert an os-name string into a Kotlin-Native platform.

    Args:
      os_name: name of the host OS from the repository ctx.

    Returns:
      Option from PLATFORMS.
    """
    os_name = os_name.lower().replace(" ", "")
    if os_name.startswith("macos"):
        return "macos"
    elif os_name.startswith("windows"):
        return "windows"
    else:
        return "linux"

KOTLIN_NATIVE_BUILD_FILE = """
# TODO(alxr): Replace wrapper script with rule here.
package(default_visibility = ["//visibility:public"])

filegroup(
  name = "all_artifacts",
  srcs = glob(["**/*"]),
)
"""

def _impl(repository_ctx):
    os_name = to_platform(repository_ctx.os.name)

    src_path = repository_ctx.path(repository_ctx.attr.path)

    repository_ctx.execute(["mkdir", "-p", src_path])
    repository_ctx.execute(["mkdir", "-p", "{0}/dependencies".format(src_path)])
    repository_ctx.execute(["mkdir", "-p", "{0}/cache".format(src_path)])

    platform = PLATFORMS[os_name]

    repository_ctx.download_and_extract(
        url = _repo_tmpl.format(**platform),
        output = repository_ctx.path(
            "{0}/kotlin-native-{1}".format(
                src_path,
                KOTLIN_NATIVE_VERSION,
            ),
        ),
        type = platform["ext"],
        sha256 = platform["sha"],
    )

    deps_names = []
    for key, (dep, sha) in platform["deps"].items():
        repository_ctx.download_and_extract(
            output = src_path,
            url = "https://bintray.com/jetbrains/kotlin-native-dependencies/download_file?file_path={0}.{ext}".format(dep, **platform),
            type = platform["ext"],
            sha256 = sha,
        )
        deps_names.append(dep)
        alias = repository_ctx.path("{0}/dependencies/{1}".format(src_path, dep))
        repository_ctx.symlink("{0}/{1}".format(src_path, dep), alias)

    repository_ctx.file("{0}/dependencies/.extracted".format(src_path), "\n".join(deps_names))
    repository_ctx.file("{0}/cache/.lock".format(src_path), "")

    repository_ctx.file("{0}/BUILD".format(src_path), KOTLIN_NATIVE_BUILD_FILE)

kotlin_native_repo = repository_rule(
    implementation = _impl,
    attrs = {
        "path": attr.string(default = ""),
    },
    doc = """Downloads the kotlin-native release and "installs" the kotlinc compiler.

    Kotlin-Native is used to compile Kotlin into Wasm. This rule downloads the latest
    experimental repository and makes the kotlinc compiler available for BUILD rules.
    """,
)
