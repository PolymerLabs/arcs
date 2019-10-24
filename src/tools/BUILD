package(default_visibility = ["//visibility:public"])

filegroup(
    name = "schema2pkg_srcs",
    srcs = glob(["schema2*.ts"]),
)

filegroup(
    name = "all_srcs",
    srcs = glob(["**"]),
)

sh_binary(
    name = "generate_root_manifest",
    srcs = ["generate_root_manifest.sh"],
)
