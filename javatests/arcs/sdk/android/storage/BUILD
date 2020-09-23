load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "support",
    testonly = 1,
    srcs = [
        "ResurrectionHelperDummyService.kt",
    ],
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
        "//java/arcs/android/storage",
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/monitor",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/robolectric:shadows",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
