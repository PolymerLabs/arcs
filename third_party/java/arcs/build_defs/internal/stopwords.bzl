"""Rules for Arcs feature stopwords detection."""

load("//third_party/java/arcs/flags:arcs_build_flag.bzl", "apply_flag_overrides")
load("//third_party/java/arcs/flags:flags.bzl", "ARCS_BUILD_FLAGS")
load(":tools.oss.bzl", "arcs_tool_stopwords")

def arcs_stopwords_test(
        name,
        apks,
        flag_overrides,
        flags = ARCS_BUILD_FLAGS,
        dev_mode = False):
    """Tests for unreleased feature keywords in a built apk.

    Defines a test target to check that the stopword definitions for all
    disabled build flags do not appear in the given apks.

    Args:
      name: the name of the test target to create
      apks: list of .apk files to test
      flag_overrides: Optional dict mapping from flag name to value (boolean). Overrides the default
          value from the flag definition.
      flags: Optional list of arcs_build_flag definitions (see arcs_build_flag.bzl). Defaults to
          ARCS_BUILD_FLAGS. Only override for testing purposes.
      dev_mode: Optional boolean indicating whether the generated class is for development purposes
          (e.g. unit tests).
    """
    flag_values = apply_flag_overrides(flags, flag_overrides, dev_mode)

    flags_by_name = {}
    for flag in flags:
        flags_by_name[flag.name] = flag

    stopwords = []
    for flag_name, flag_value in flag_values.items():
        if not flag_value:
            # Flag is disabled for this build. Check that it didn't leak.
            stopwords.extend(flags_by_name[flag_name].stopwords)

    if len(stopwords) == 0:
        # There's nothing to check; don't create the test.
        return

    # OR together all of the stopwords regexes, e.g. (abc|def|ghi).
    regex = "({})".format("|".join(stopwords))

    arcs_tool_stopwords(
        name = name,
        regex = regex,
        apks = apks,
    )
