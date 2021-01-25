load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "service",
    manifest = "AndroidManifest.xml",
    package = "arcs.sdk.android.storage.service",
    deps = [
        "//java/arcs/android/common/resurrection",
        "//java/arcs/android/crdt:crdt_exception_android_proto",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/android/storage/ttl",
        "//java/arcs/android/util/testutil",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/flags/testing",
        "//java/arcs/jvm/storage/database/testutil",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
