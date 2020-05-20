load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

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
        "//java/arcs/core/common",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/api",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/androidx/lifecycle",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_android_test_suite(
    name = "tests",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.schematests.references",
    deps = [
        ":particles",
        "//java/arcs/android/storage/database",
        "//java/arcs/core/storage/api",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
