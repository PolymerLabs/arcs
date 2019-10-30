load("//third_party/java/arcs/build_defs:run_in_repo.bzl", "run_in_repo")

# Webpacks the pipes-shell code for Android, by running android_deploy.sh. Puts
# it under an arcs/ subfolder.
run_in_repo(
    name = "pipes_shell_android",
    srcs = glob(["**"]),
    outs = ["arcs"],
    cmd = "$(location :android_deploy_bin) $(location :arcs)",
    progress_message = "Webpacking pipes-shell",
    visibility = ["//visibility:public"],
    deps = [
        ":android_deploy_bin",
        ":web_deploy_srcs",
    ],
)

filegroup(
    name = "web_deploy_srcs",
    srcs = glob(
        ["web/deploy/**"],
        exclude = ["web/deploy/android_deploy.sh"],
    ),
)

filegroup(
    name = "android_deploy_bin",
    srcs = ["web/deploy/android_deploy.sh"],
)
