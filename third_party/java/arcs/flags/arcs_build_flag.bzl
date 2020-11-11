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

def arcs_build_flag(name, desc, bug_id, status):
    """Defines an Arcs build flag for a new feature.

    Args:
      name: The name of the feature. Should be lower_snake_case.
      desc: A short description of the feature.
      bug_id: A bug ID of the form "b/123456" for documentation purposes, or a
          string explaining why one is not needed.
      status: The status of this feature flag. Value must be one of _FEATURE_STATUSES.

    Returns:
      A struct containing the build flag data.
    """
    flag = struct(
        name = name,
        desc = desc,
        bug_id = bug_id,
        status = status,
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
