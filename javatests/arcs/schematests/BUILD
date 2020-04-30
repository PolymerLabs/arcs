load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

arcs_kt_gen(
    name = "schema_arcs_gen",
    srcs = ["schema.arcs"],
)

arcs_kt_android_library(
    name = "particles",
    testonly = 1,
    srcs = [
        "Arcs.kt",
        "Items.kt",
        "Reader.kt",
        "Writer.kt",
    ],
    deps = [
        ":schema_arcs_gen",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/storage/database",
        "//java/arcs/core/allocator",
        "//java/arcs/core/host",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/androidx/lifecycle",
    ],
)

arcs_kt_android_test_suite(
    name = "tests",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.schematests",
    deps = [
        ":particles",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
