# Wrapper script around Emscripten command line tools (i.e. em++).
sh_binary(
    name = "emsdk_wrapper",
    srcs = ["emsdk_wrapper.sh"],
    data = [
        "//emscripten_cache",
        "@emsdk//:all_files",
    ],
    visibility = ["//visibility:public"],
)
