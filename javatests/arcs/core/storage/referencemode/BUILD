load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "referencemode",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.storage.referencemode",
    deps = [
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
