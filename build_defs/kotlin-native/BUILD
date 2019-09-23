# Wrapper script around Kotlin-Native command line tools (i.e. kotlinc).
load("//build_defs/kotlin-native:repo.bzl", "get_dependencies")

sh_binary(
    name = "kotlinc_wrapper",
    srcs = ["kotlinc_wrapper.sh"],
    data = select({
        "@bazel_tools//src/conditions:windows": ["@kotlin_native_{0}//:all_files".format("windows")],
        "@bazel_tools//src/conditions:darwin": ["@kotlin_native_{0}//:all_files".format("macos")],
        "@bazel_tools//src/conditions:darwin_x86_64": ["@kotlin_native_{0}//:all_files".format("macos")],
        "@bazel_tools//src/conditions:linux_x86_64": ["@kotlin_native_{0}//:all_files".format("linux")]
    })
     + select({
        "@bazel_tools//src/conditions:windows": ["@{0}//:all_files".format(name) for name, _ in get_dependencies("windows")],
        "@bazel_tools//src/conditions:darwin": ["@{0}//:all_files".format(name) for name, _ in get_dependencies("macos")],
        "@bazel_tools//src/conditions:darwin_x86_64": ["@{0}//:all_files".format(name) for name, _ in get_dependencies("macos")],
        "@bazel_tools//src/conditions:linux_x86_64": ["@{0}//:all_files".format(name) for name, _ in get_dependencies("linux")],
    }),
    visibility = ["//visibility:public"],
)

