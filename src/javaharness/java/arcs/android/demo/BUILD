package(default_visibility = ["//java/arcs/demo:__subpackages__",
                              "//javatests/arcs/demo:__subpackages__"])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library", "android_binary")

android_library(
  name = "lib",
  srcs = glob(["**/*.java"]),
  javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
  deps = [
      "//java/arcs/api:api-android",
      "//java/arcs/android/impl",
      "//java/arcs/demo/particles:particles-android",
      "//java/arcs/demo/services:services-android",
      "@com_google_dagger",
      "@javax_inject_source//jar",
      "@flogger//jar",
      "@flogger_system_backend//jar",
   ],
   manifest = "AndroidManifest.xml",
   resource_files = glob(["res/**"]),
)

android_binary(
    name = "app",
    manifest = "AndroidManifest.xml",
    deps = [":lib"],
    licenses = ["notice"],
    dexopts = ["--min-sdk-version=28", "--target-sdk-version=28"],
)


