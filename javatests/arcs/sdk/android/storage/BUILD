load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

arcs_kt_android_library(
    name = "support",
    testonly = 1,
    srcs = ["ResurrectionHelperDummyService.kt"],
    manifest = "AndroidManifest.xml",
)

arcs_kt_android_test_suite(
    name = "storage",
    srcs = glob(["*Test.kt"]),
    manifest = "AndroidManifest.xml",
    package = "arcs.sdk.android.storage",
    deps = [
        ":support",
        "//java/arcs/android/common/resurrection",
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/type",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/monitor",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/robolectric:shadows",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
