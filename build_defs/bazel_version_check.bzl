"""Checks that the correct version of bazel is installed."""

# The minimum required version of bazel.
# KEEP UP TO DATE WITH tools/install_bazel.sh
_MIN_BAZEL_VERSION = "1.2.0"

def _parse_version(version):
    # Bazel version should be of form x.y.z
    parts = version.split(".")
    if len(parts) != 3:
        fail(("Unable to parse bazel version \"%s\". Expected format of form " +
              "\"x.y.z\".") % version)
    return tuple([int(n) for n in parts])

def bazel_version_check():
    """Checks that the correct version of bazel is installed.

    Fails if it isn't. Returns silently if it is. Call from WORKSPACE file.
    """
    installed_version_tuple = _parse_version(native.bazel_version)
    min_version_tuple = _parse_version(_MIN_BAZEL_VERSION)
    if min_version_tuple > installed_version_tuple:
        fail(("ERROR: Minimum required bazel version is \"{min}\". You have " +
              "\"{installed}\".").format(
            min = _MIN_BAZEL_VERSION,
            installed = native.bazel_version,
        ))
