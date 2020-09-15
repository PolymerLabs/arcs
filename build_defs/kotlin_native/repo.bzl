"""Kotlin Native repository rules.

Upgrades: update the version constant below, as well as the constant in the `kotlinc_wrapper.sh` script.
Archive artifacts may also need to be updated, see comments below.
"""

KOTLIN_NATIVE_VERSION = "1.4.0"

_repo_tmpl = KOTLIN_NATIVE_VERSION.join([
    "https://github.com/JetBrains/kotlin/releases/download/v",
    "/kotlin-native-{platform}-1.4.{ext}",
])

# The following are dependencies for each platform-specific version of the Kotlin-Native compiler. Dependencies are
# determined from the `konan.properties` file. The latest version of this file can be found here:
# https://github.com/JetBrains/kotlin-native/blob/master/konan/konan.properties. As of writing (2020-09), the following
# dependencies were extracted from this version and location of the properties file:
# https://github.com/JetBrains/kotlin-native/blob/v1.4.0/konan/konan.properties#L671
#
# Each platform-specific dependency was downloaded from the $downloadUrl location (see property at the top of the file),
# which currently maps to https://download.jetbrains.com/kotlin/native.
#
# If SHAs are not provided, they can be calculated by invoking https://linux.die.net/man/1/sha256sum on each compressed
# artifact.
_WINDOWS_DEPENDENCIES = [
    ("libffi-3.2.1-mingw-w64-x86-64", "2047faedec4ca6bc074e12642ecf3a14545cbb248224ef3637965714d7e7ea5f"),
    ("msys2-mingw-w64-x86_64-clang-llvm-lld-compiler_rt-8.0.1", "413cfdf2e512151b73268d7b538fff3b333b2e35ba3dacc0465b6c71a6e7fd87"),
    ("target-sysroot-4-embedded", "99c8482e94fe50d67b1c635ccbdfb4119eb2df0b9f260a072fd592167f73398a"),
    ("target-toolchain-2-mingw-wasm", "ed047e05a64d83cbbc9475f80026f10730b508eaa638d949fec9b371bbd08ae2"),
]

_MACOS_DEPENDENCIES = [
    ("libffi-3.2.1-3-darwin-macos", "b83357b2d4ad4be9d5466ac3cbf12570928d84109521ab687672ec8ef47d9edc"),
    ("clang-llvm-apple-8.0.0-darwin-macos", "0a4f2aae9b62161088fd895a011ac2b516803f93f704b79bbb89227762304ef8"),
    ("target-sysroot-4-embedded", "99c8482e94fe50d67b1c635ccbdfb4119eb2df0b9f260a072fd592167f73398a"),
    ("target-toolchain-3-macos-wasm", "21841134a97e287507d426b1ce767a55416ef4b639ca88b691f125185600ea3d"),
]

_LINUX_DEPENDENCIES = [
    ("libffi-3.2.1-2-linux-x86-64", "9d817bbca098a2fa0f1d5a8b9e57674c30d100bb4c6aeceff18d8acc5b9f382c"),
    ("clang-llvm-8.0.0-linux-x86-64", "a9ebf55170bdbe5e089dbf884e0bc52065b5b7bc52e9354415e25a36e10e56c5"),
    ("target-sysroot-4-embedded", "99c8482e94fe50d67b1c635ccbdfb4119eb2df0b9f260a072fd592167f73398a"),
    ("target-toolchain-2-linux-wasm", "c48ee8453d3c075f990875802ea56f9ae31e89f8ef3faddbdaa59413e17098a9"),
]

# Releases can be found at: https://github.com/JetBrains/kotlin/releases/tag/v<version>
# For example, this version is located at: https://github.com/JetBrains/kotlin/releases/tag/v1.4.0
# Here, you'll find a compressed archive for each platform. SHAs should be provided, and they can be calculated with
# https://linux.die.net/man/1/sha256sum.
PLATFORMS = {
    "windows": {
        "platform": "windows",
        "ext": "zip",
        "deps": _WINDOWS_DEPENDENCIES,
        "sha": "151d6ca6e21f56be79b9dba6513d4c93a3388b648f25926cf0d291ff4fbfc4ae",
    },
    "macos": {
        "platform": "macos",
        "ext": "tar.gz",
        "deps": _MACOS_DEPENDENCIES,
        "sha": "476f920631b0ccb4b8e25456ef49356fb33d6e3960e9f2ec8def0aaa23284168",
    },
    "linux": {
        "platform": "linux",
        "ext": "tar.gz",
        "deps": _LINUX_DEPENDENCIES,
        "sha": "ca4981eab287315bb53aee153cee5e703adf651dd3f0f0229d12124f65ce8d56",
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
    for (dep, sha) in platform["deps"]:
        # Url is set to the 1.4.0 download url, found here:
        # https://github.com/JetBrains/kotlin-native/blob/v1.4.0/konan/konan.properties
        repository_ctx.download_and_extract(
            output = src_path,
            url = "https://download.jetbrains.com/kotlin/native/{0}.{ext}".format(dep, **platform),
            type = platform["ext"],
            sha256 = sha,
        )
        deps_names.append(dep)
        alias = repository_ctx.path("{0}/dependencies/{1}".format(src_path, dep))
        repository_ctx.symlink("{0}/{1}".format(src_path, dep), alias)

    repository_ctx.file("{0}/dependencies/.extracted".format(src_path), "\n".join(deps_names))

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
