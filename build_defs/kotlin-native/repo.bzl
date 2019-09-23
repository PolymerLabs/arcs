load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_kotlin_native_version = "1.3.50"

_repo_tmpl = _kotlin_native_version.join(["https://github.com/JetBrains/kotlin/releases/download/v","/kotlin-native-{platform}-",".{ext}"])

_WINDOWS_DEPENDENCIES = [
    ("libffi-3.2.1-mingw-w64-x86-64", ""),
    ("msys2-mingw-w64-x86_64-gcc-7.3.0-clang-llvm-lld-6.0.1-2", ""),
    ("target-toolchain-2-mingw-wasm", ""),
    ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
  ]

_MACOS_DEPENDENCIES = [
    ("libffi-3.2.1-3-darwin-macos", "b83357b2d4ad4be9d5466ac3cbf12570928d84109521ab687672ec8ef47d9edc"),
    ("clang-llvm-6.0.1-darwin-macos", "21b1bfb5d11c07aad7627c121b323202da257ed2276afa6942d4086ab393509a"),
    ("target-toolchain-3-macos-wasm", "21841134a97e287507d426b1ce767a55416ef4b639ca88b691f125185600ea3d"),
    ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
  ]

_LINUX_DEPENDENCIES = [
    ("libffi-3.2.1-2-linux-x86-64", ""),
    ("clang-llvm-6.0.1-linux-x86-64", ""),
    ("target-toolchain-2-linux-wasm", ""),
    ("target-sysroot-2-wasm", "039958041b364458d652237aaa06c12b89973ef0934819cca9d47299f1a76b64"),
  ]

PLATFORMS = [
    {"platform": "windows", "ext": "zip", "deps": _WINDOWS_DEPENDENCIES,
     "sha": "2eed825696fcae19c49d3a32ee5a43971dd4992c2ce99a9a2be6e88334bcf875"},
    {"platform": "macos", "ext": "tar.gz", "deps": _MACOS_DEPENDENCIES,
     "sha": "100920f1a3352846bc5a2990c87cb71f221abf8261251632ad10c6459d962393"},
    {"platform": "linux", "ext": "tar.gz", "deps": _LINUX_DEPENDENCIES,
     "sha": "15eb0589aef8dcb435e4cb04ef9a3ad90b8d936118b491618a70912cef742874"},
]

def get_dependencies(target):
  for p in PLATFORMS:
      if p["platform"] == target:
          return p["deps"]
  return []

# TODO(alxr) remove
def print_and_return(p):
    out = _repo_tmpl.format(**p)
    print(out)
    return out

def kotlin_native_repo():
    """Downloads the kotlin-native release and "installs" the kotlinc compiler.

    Kotlin-Native is used to compile Kotlin into Wasm. This rule downloads the latest
    experimental repository and makes the kotlinc compiler available for BUILD rules.
    """
    for p in PLATFORMS:
        http_archive(
            name = "kotlin_native_{platform}".format(**p),
            url = print_and_return(p),
            type = "tar.gz",
            sha256 = p["sha"],
            build_file = "//build_defs/kotlin-native:kotlinc.BUILD",
        )

        [http_archive(
            name = x,
            urls = ["https://bintray.com/jetbrains/kotlin-native-dependencies/download_file?file_path={0}.tar.gz".format(x)],
            type = "tar.gz",
            sha256 = sha,
            build_file = "//build_defs/kotlin-native:konan.BUILD",
        ) for x, sha in p["deps"]]

