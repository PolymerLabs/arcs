load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "devtools",
    srcs = [
        "JsonEncodingsTest.kt",
        "ModelUpdateMessageTest.kt",
        "StoreOperationMessageTest.kt",
    ],
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
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)

arcs_kt_android_test_suite(
    name = "devtoolsservice",
    srcs = [
        "DevToolsStarterTest.kt",
        "DevToolsTests.kt",
    ],
    manifest = "AndroidManifest.xml",
    package = "arcs.android.devtools",
    deps = [
        "//java/arcs/android/devtools",
        "//java/arcs/core/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
