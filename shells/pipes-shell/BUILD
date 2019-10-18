load("//build_defs:run_in_repo.bzl", "run_in_repo")

# Webpacks the pipes-shell code for web, by running the deploy.sh script. The
# result gets copied into a pipes_shell_web_dist folder in bazel-bin.
run_in_repo(
    name = "pipes_shell_web",
    srcs = glob(["**"]),
    outs = ["pipes_shell_web_dist"],
    cmd = "set OLDPWD=$PWD && cd $PWD/$(dirname $(location //shells/pipes-shell:web_deploy_bin)) && " +
          "./deploy.sh && " +
          "cp -r dist $OLDPWD/{OUT}",
    progress_message = "Webpacking pipes-shell",
    visibility = ["//visibility:public"],
    deps = [
        "//tools:sigh_webpack",
        ":web_deploy_srcs",
        ":web_deploy_bin",
    ],
)

filegroup(
    name = "web_deploy_srcs",
    srcs = glob(["web/deploy/**"], exclude = ["web/deploy/deploy.sh"]),
)

filegroup(
    name = "web_deploy_bin",
    srcs = ["web/deploy/deploy.sh"],
)
