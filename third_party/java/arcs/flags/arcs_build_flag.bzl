"""Rules for defining Arcs build flags."""

# Dict of valid values for flag definitions. Maps to an integer value giving the ordering of
# statuses. Flags with a higher-value status cannot depend on flag with a lower one.
_FEATURE_STATUSES = {
    # Flag is disabled by default, and must be manually overridden, e.g. in feature-specific unit
    # tests, and should not be launched in client releases yet. Features that are still under
    # development and that don't work end-to-end yet should be set to NOT_READY.
    "NOT_READY": 0,

    # Flag is enabled for development Arcs builds, and is ready to be enabled for individual client
    # release builds on an opt-in basis. Features that are fully working end-to-end and are ready to
    # start rolling out in client builds should be marked READY.
    "READY": 1,

    # Flag is fully launched in all clients. Can still be disabled by clients if necessary, but
    # shouldn't be. Features which are fully working and have been rolled out to production should
    # be marked LAUNCHED. The expectation is that features marked as LAUNCHED will be cleaned up
    # imminently and their flags removed.
    "LAUNCHED": 2,
}

def arcs_build_flag(name, desc, bug_id, status, stopwords = [], required_flags = []):
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
      required_flags: Optional list of names of other build flags that must be enabled in order for
          this flag to be enabled.

    Returns:
      A struct containing the build flag data.
    """
    flag = struct(
        name = name,
        desc = desc,
        bug_id = bug_id,
        status = status,
        stopwords = stopwords,
        required_flags = required_flags,
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
    if type(flag.required_flags) != "list":
        fail("required_flags must be a list of strings for flag '%s'." % flag.name)
    for required_flag in flag.required_flags:
        if type(required_flag) != "string":
            fail("required_flags must be a list of strings for flag '%s'." % flag.name)

def validate_flag_list(flags):
    """Verifies that a list of Arcs build flags is valid.

    Args:
      flags: list of arcs_build_flag instances
    """
    visited_flag_names = {}
    flags_by_name = {flag.name: flag for flag in flags}

    for flag in flags:
        validate_flag(flag)
        if flag.name in visited_flag_names:
            fail("Multiple definitions of flag named '%s'." % flag.name)
        visited_flag_names[flag.name] = 1

        # Verify that required flags are sane, and that their statuses are compatible.
        for required_flag in flag.required_flags:
            if required_flag == flag.name:
                fail("Flag '%s' cannot require itself." % flag.name)
            if required_flag not in flags_by_name:
                fail("Flag '%s' requires flag '%s' which does not exist." % (
                    flag.name,
                    required_flag,
                ))
            required_flag_status = flags_by_name[required_flag].status
            if _FEATURE_STATUSES[required_flag_status] < _FEATURE_STATUSES[flag.status]:
                fail("Flag '%s' with status '%s' cannot depend on flag '%s' with status '%s'." % (
                    flag.name,
                    flag.status,
                    required_flag,
                    required_flag_status,
                ))

def validate_flag_overrides(flags, flag_overrides):
    """Verifies that flag overrides are valid.

    Args:
      flags: list of arcs_build_flag definitions
      flag_overrides: Optional dict mapping from flag name to value (boolean). Overrides the default
          value from the flag definition.
    """
    validate_flag_list(flags)

    flags_by_name = {flag.name: flag for flag in flags}

    for flag_name, value in flag_overrides.items():
        # Sanity check flag override value.
        if type(value) != "bool":
            fail("Cannot override flag '%s': expected True/False got %s." % (flag_name, value))
        if flag_name not in flags_by_name:
            fail("Cannot override flag '%s': unknown flag name." % flag_name)

        # Verify that status allows overriding.
        status = flags_by_name[flag_name].status
        if status == "NOT_READY":
            fail("Cannot override flag '%s': feature status is NOT_READY." % flag_name)
        if status == "LAUNCHED" and value == False:
            fail(("Cannot override flag '%s' to False: feature status is LAUNCHED. Status must " +
                  "be changed to READY to allow overriding.") % flag_name)

def _validate_required_flags(flags, flag_values):
    """Verifies that all enabled flags have their required flags enabled.

    Args:
      flags: list of arcs_build_flag definitions
      flag_values: dict mapping from flag name to value (boolean)
    """
    flags_by_name = {flag.name: flag for flag in flags}
    for flag_name, value in flag_values.items():
        if not value:
            continue
        for required_flag in flags_by_name[flag_name].required_flags:
            if not flag_values[required_flag]:
                fail("Cannot enable flag '%s': required flag '%s' is disabled." % (
                    flag_name,
                    required_flag,
                ))

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

    _validate_required_flags(flags, flag_values)

    return flag_values
