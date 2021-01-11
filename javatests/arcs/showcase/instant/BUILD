load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["instant.arcs"],
)

arcs_kt_android_library(
    name = "particles",
    testonly = 1,
    srcs = [
        "Calendar.kt",
        "EventsToday.kt",
    ],
    deps = [
        ":codegen",
        "//java/arcs/android/storage/database",
        "//java/arcs/core/entity",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk:sdk-kt",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//javatests/arcs/android/integration",
    ],
)

arcs_kt_android_test_suite(
    name = "tests",
    size = "small",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.showcase.instant",
    deps = [
        ":codegen",
        ":particles",
        "//java/arcs/core/allocator",
        "//java/arcs/core/common",
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/sdk:sdk-kt",
        "//javatests/arcs/android/integration",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
