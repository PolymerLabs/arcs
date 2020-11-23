#!/bin/bash
#
# Stopwords detector for Arcs. Searches for a given regex in the .dex files of
# the given .apk file(s).

err() {
  echo "$*" >&2
}

fail() {
  err "$*"
  exit 1
}

usage()
{
  echo "Usage: $0 -r '(secret|special)' <path/to/apk>"
  exit 1
}

# Parse command line flags.
while getopts "r:h" flag; do
  case "${flag}" in
    r) regex="${OPTARG}" ;;
    h) usage ;;
  esac
done

if [[ -z "$regex" ]]; then
  err "Flag -r is required"
  usage
fi

# Rest of args are the apks to process.
shift $((OPTIND - 1))

if [[ $# == 0 ]]; then
  fail "At least one apk arg is required"
fi

for apk in "$@"; do
  # Get list of all .dex files in apk.
  dex_files=($(zipinfo -1 "${apk}" | grep '\.dex$'))

  # Unzip all dex files and look for stopwords regex. Pipe to `strings` to
  # extract all text content from the dex, and then grep for the regex. Any
  # matches found are stopwords violations and are piped to stderr.
  unzip -p "${apk}" "${dex_files[@]}" \
    | strings \
    | grep -E --ignore-case "${regex}" 1>&2
  return_codes=( "${PIPESTATUS[@]}" )
  if (( return_codes[0] != 0 || return_codes[1] != 0 )); then
    fail "ERROR: Something went wrong when running unzip/strings"
  fi

  # Exit code 0 means results were found, 1 means no results found, 2 means an
  # error occurred.
  if (( return_codes[2] == 1 )); then
    echo "${apk} looks OK"
  else
    fail "ERROR: Stopwords found in ${apk}"
  fi
done

exit 0
