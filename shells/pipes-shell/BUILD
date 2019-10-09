load("//build_defs:run_in_repo.bzl", "run_in_repo")

# Webpacks the pipes-shell code for web, by running the deploy.sh script. The
# result gets copied into a pipes_shell_web_dist folder in bazel-bin.
run_in_repo(
    name = "pipes_shell_web",
    srcs = glob(["**"]),
    outs = ["pipes_shell_web_dist"],
    cmd = "cd shells/pipes-shell/web/deploy && " +
          "./deploy.sh && " +
          "cp -r dist {OUT}",
    progress_message = "Webpacking pipes-shell",
    visibility = ["//visibility:public"],
    deps = [
        "//tools:sigh_webpack",
    ],
)
