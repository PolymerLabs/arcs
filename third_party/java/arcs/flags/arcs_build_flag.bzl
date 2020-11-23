"""Rules for defining Arcs build flags."""

# Set of valid values for flag definitions.
_FEATURE_STATUSES = [
    # Flag is disabled by default, and must be manually overridden, e.g. in feature-specific unit
    # tests, and should not be launched in client releases yet. Features that are still under
    # development and that don't work end-to-end yet should be set to NOT_READY.
    "NOT_READY",

    # Flag is enabled for development Arcs builds, and is ready to be enabled for individual client
    # release builds on an opt-in basis. Features that are fully working end-to-end and are ready to
    # start rolling out in client builds should be marked READY.
    "READY",

    # Flag is fully launched in all clients. Can still be disabled by clients if necessary, but
    # shouldn't be. Features which are fully working and have been rolled out to production should
    # be marked LAUNCHED. The expectation is that features marked as LAUNCHED will be cleaned up
    # imminently and their flags removed.
    "LAUNCHED",
]

def arcs_build_flag(name, desc, bug_id, status, stopwords = []):
    """Defines an Arcs build flag for a new feature.

    Args:
      name: The name of the feature. Should be lower_snake_case.
      desc: A short description of the feature.
      bug_id: A bug ID of the form "b/123456" for documentation purposes, or a
          string explaining why one is not needed.
      status: The status of this feature flag. Value must be one of _FEATURE_STATUSES.
      stopwords: Optional list of stopword regexes for the feature. Will be used to test that
          feature code was correctly flag guarded and did not leak into built binaries. Case
          insensitive grep-style regex syntax.

    Returns:
      A struct containing the build flag data.
    """
    flag = struct(
        name = name,
        desc = desc,
        bug_id = bug_id,
        status = status,
        stopwords = stopwords,
    )
    validate_flag(flag)
    return flag

def validate_flag(flag):
    """Verifies that the Arcs build flag is valid.

    Args:
      flag: an instance of arcs_build_flag
    """
    if type(flag.name) != "string":
        fail("Flag name must be a string: %s" % flag.name)
    if flag.name == "":
        fail("Flag name must not be empty.")
    if flag.bug_id == None:
        fail("bug_id must be provided for flag '%s'." % flag.name)
    if flag.desc == None:
        fail("desc must be provided for flag '%s'." % flag.name)
    if flag.status not in _FEATURE_STATUSES:
        fail("Flag '{name}' has status '{status}', but must be one of: {status_list}".format(
            name = flag.name,
            status = flag.status,
            status_list = ", ".join(_FEATURE_STATUSES),
        ))
    if type(flag.stopwords) != "list":
        fail("Stopwords must be a list of strings for flag '%s'." % flag.name)
    for stopword in flag.stopwords:
        if type(stopword) != "string":
            fail("Stopwords must be a list of strings for flag '%s'." % flag.name)

def validate_flag_overrides(flags, flag_overrides):
    """Verifies that flag overrides are valid.

    Args:
      flags: list of arcs_build_flag definitions
      flag_overrides: Optional dict mapping from flag name to value (boolean). Overrides the default
          value from the flag definition.
    """
    flag_statuses = {}

    for flag in flags:
        validate_flag(flag)
        if flag.name in flag_statuses:
            fail("Multiple definitions of flag named '%s'." % flag.name)
        flag_statuses[flag.name] = flag.status

    for flag_name, value in flag_overrides.items():
        if type(value) != "bool":
            fail("Cannot override flag '%s': expected True/False got %s." % (flag_name, value))
        if flag_name not in flag_statuses:
            fail("Cannot override flag '%s': unknown flag name." % flag_name)
        status = flag_statuses[flag_name]
        if status == "NOT_READY":
            fail("Cannot override flag '%s': feature status is NOT_READY." % flag_name)
        if status == "LAUNCHED" and value == False:
            fail(("Cannot override flag '%s' to False: feature status is LAUNCHED. Status must " +
                  "be changed to READY to allow overriding.") % flag_name)

def apply_flag_overrides(flags, flag_overrides, dev_mode):
    """Computes the final value of all flags from the given overrides.

    Args:
      flags: list of arcs_build_flag definitions
      flag_overrides: Optional dict mapping from flag name to value (boolean). Overrides the default
          value from the flag definition.
      dev_mode: Optional boolean indicating whether the generated class is for development purposes
          (e.g. unit tests).

    Returns:
      Dict mapping from flag name to value (true/false)
    """
    validate_flag_overrides(flags, flag_overrides)

    flag_values = {}

    # Compute default for each flag based off the flag feature status.
    for flag in flags:
        if dev_mode:
            # Flags are on by default in dev mode, unless flag status is NOT_READY.
            flag_values[flag.name] = (flag.status != "NOT_READY")
        else:
            # Flags are off by default in prod mode, unless flag status is LAUNCHED.
            flag_values[flag.name] = (flag.status == "LAUNCHED")

    # Override flag default values based off supplied parameters.
    for flag_name, value in flag_overrides.items():
        flag_values[flag_name] = value

    return flag_values
