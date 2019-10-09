load("//build_defs:run_in_repo.bzl", "run_in_repo")

# Runs sigh 'webpack' command.
run_in_repo(
    name = "sigh_webpack",
    srcs = ["//src:core_srcs"],
    outs = ["worker.js"],
    # Run webpack, then copy the output to the location bazel expects it to be.
    cmd = "./tools/sigh webpack && cp ./shells/lib/build/worker.js {OUT}",
    progress_message = "Webpacking Arcs runtime",
    visibility = ["//visibility:public"],
    deps = [],
)
