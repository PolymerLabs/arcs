load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "devtools",
    srcs = ["DevToolsMessageTests.kt"],
    package = "arcs.android.devtools",
    deps = [
        "//java/arcs/android/devtools",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/rules",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/nanohttpd",
        "//third_party/java/nanohttpd:nanohttpd_websocket",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)

arcs_kt_android_test_suite(
    name = "devtoolsservice",
    srcs = ["DevToolsTests.kt"],
    manifest = "AndroidManifest.xml",
    package = "arcs.android.devtools",
    deps = [
        "//java/arcs/android/common/resurrection",
        "//java/arcs/android/devtools",
        "//java/arcs/android/devtools:aidl",
        "//java/arcs/android/devtools/storage:devtools",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/testutil",
        "//java/arcs/sdk/android/storage",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/rules",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
