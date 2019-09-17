load("@android_sdk_downloader//:rules.bzl", "android_sdk_repository")

# Gets set to True by the travis_install_android_sdk.sh script, which is run on
# Travis. Otherwise leave this as False for local development, and use your
# regular Android SDK path.
_RUNNING_ON_TRAVIS = False

def android_sdk():
  if _RUNNING_ON_TRAVIS:
    # Download and install the Android SDK. Requires that android_sdk_downloader
    # repo was set up in the WORKSPACE file. 
    android_sdk_repository(
      name = "androidsdk",
      api_level = 29,
      build_tools_version = "29.0.2",
      workspace_name = "arcs_javaharness",
    )
  else:
    # Use a local Android SDK installation located at environment variable
    # ANDROID_HOME.
    native.android_sdk_repository(
      name = "androidsdk",
      api_level = 29,
    )
