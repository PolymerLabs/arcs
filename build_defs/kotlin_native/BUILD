# Wrapper script around Kotlin-Native command line tools (i.e. kotlinc).
load("//build_defs/kotlin_native:repo.bzl", "get_dependencies")

KOTLIN_PLATFORM_TMPL = "@kotlin_native_{0}//:all_files"

KOTLIN_DEP_TMPL = "@{0}//:all_files"

sh_binary(
    name = "kotlinc_wrapper",
    srcs = ["kotlinc_wrapper.sh"],
    data = select({
               "@bazel_tools//src/conditions:windows": [KOTLIN_PLATFORM_TMPL.format("windows")],
               "@bazel_tools//src/conditions:darwin": [KOTLIN_PLATFORM_TMPL.format("macos")],
               "@bazel_tools//src/conditions:darwin_x86_64": [KOTLIN_PLATFORM_TMPL.format("macos")],
               "@bazel_tools//src/conditions:linux_x86_64": [KOTLIN_PLATFORM_TMPL.format("linux")],
           }) +
           select({
               "@bazel_tools//src/conditions:windows": [KOTLIN_DEP_TMPL.format(name) for name, _ in get_dependencies("windows")],
               "@bazel_tools//src/conditions:darwin": [KOTLIN_DEP_TMPL.format(name) for name, _ in get_dependencies("macos")],
               "@bazel_tools//src/conditions:darwin_x86_64": [KOTLIN_DEP_TMPL.format(name) for name, _ in get_dependencies("macos")],
               "@bazel_tools//src/conditions:linux_x86_64": [KOTLIN_DEP_TMPL.format(name) for name, _ in get_dependencies("linux")],
           }),
    visibility = ["//visibility:public"],
)
