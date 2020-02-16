""" No-op rules that internal tools use. """

def register_extension_info(
        extension = None,
        extension_name = None,
        label_regex_for_dep = None,
        deps_attr = None,
        label_regex_map = None,
        never_fix = None):
    # something no-op so lint doesn't complain
    pass
