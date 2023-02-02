load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "jvm",
    srcs = ["AndroidBinderStatsParserTest.kt"],
    package = "arcs.android.util",
    deps = [
        "//java/arcs/android/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)

arcs_kt_android_test_suite(
    name = "android",
    srcs = ["AndroidLogTest.kt"],
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.util",
    deps = [
        "//java/arcs/android/util",
        "//java/arcs/core/util",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)
