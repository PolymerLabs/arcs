load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# NodeJS

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "0942d188f4d0de6ddb743b9f6642a26ce1ad89f09c0035a9a5ca5ba9615c96aa",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.38.1/rules_nodejs-0.38.1.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

node_repositories(
    node_version = "10.16.0",
    package_json = ["//:package.json"],
    yarn_version = "1.13.0",
)

# Install Emscripten via the emsdk.

load("//build_defs/emscripten:repo.bzl", "emsdk_repo")

emsdk_repo()

# Install the Kotlin-Native compiler

load("//build_defs/kotlin_native:repo.bzl", "kotlin_native_repo")

kotlin_native_repo()

# Android SDK

android_sdk_repository(
    name = "androidsdk",
    api_level = 29,
)

http_archive(
    name = "build_bazel_rules_android",
    sha256 = "cd06d15dd8bb59926e4d65f9003bfc20f9da4b2519985c27e190cddc8b7a7806",
    strip_prefix = "rules_android-0.1.1",
    urls = ["https://github.com/bazelbuild/rules_android/archive/v0.1.1.zip"],
)

# Kotlin

rules_kotlin_version = "7543a917cda483c5856ec79b590343c9669eacd6"

rules_kotlin_sha = "d335be363937ed62b5758cfdb33910ee52429835685345ef6b9f009c2bff9a9d"

http_archive(
    name = "io_bazel_rules_kotlin",
    sha256 = rules_kotlin_sha,
    strip_prefix = "rules_kotlin-%s" % rules_kotlin_version,
    urls = ["https://github.com/bazelbuild/rules_kotlin/archive/%s.tar.gz" % rules_kotlin_version],
)

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kotlin_repositories", "kt_register_toolchains")

kotlin_repositories()

kt_register_toolchains()

# Java deps from Maven.

RULES_JVM_EXTERNAL_TAG = "2.8"

RULES_JVM_EXTERNAL_SHA = "79c9850690d7614ecdb72d68394f994fef7534b292c4867ce5e7dec0aa7bdfad"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

AUTO_VALUE_VERSION = "1.7"

maven_install(
    artifacts = [
        "org.json:json:20141113",
        "com.google.flogger:flogger:0.4",
        "com.google.flogger:flogger-system-backend:0.4",
        "com.google.dagger:dagger:2.23.1",
        "com.google.dagger:dagger-compiler:2.23.1",
        "javax.inject:javax.inject:1",
        "junit:junit:4.11",
        "com.google.auto.value:auto-value:" + AUTO_VALUE_VERSION,
        "com.google.auto.value:auto-value-annotations:" + AUTO_VALUE_VERSION,
    ],
    repositories = [
        "https://jcenter.bintray.com/",
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
)
