load(
    "@build_bazel_rules_android//android:rules.bzl",
    _android_binary = "android_binary",
    _android_library = "android_library",
    _android_local_test = "android_local_test",
)

android_binary = _android_binary

android_library = _android_library

android_local_test = _android_local_test
