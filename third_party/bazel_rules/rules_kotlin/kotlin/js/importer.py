# Copyright 2018 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import argparse
import os
import zipfile
import re


def _is_jar(jar):
  if not os.path.exists(jar):
    raise argparse.ArgumentTypeError("jar:{0} does not exist".format(jar))
  else:
    return zipfile.ZipFile(jar)


def _extract_root_entry(jar, output_path, filename_pattern, touch=False):
  """
  Extracts a root entry from a jar. and write it to a path.
  entry_path is absolute and the basename is used to extract the entry from the jar.
  :param jar: The jar from which to make the extraction.
  :param entry_path: An absolute file path to where the entry should be written.
  :param touch: Should the file be touched if it was not found in the jar.
  """

  pattern = "^[^%s]+%s" % (re.escape(os.path.separator), filename_pattern)
  for info in jar.infolist():
    if re.search(pattern, info.filename):
      try:
        jar.read(info)
      except Exception as ex:
        if touch:
          f = open(output_path, 'a')
          f.close()
          return
        else:
          raise ex
      jar.extract(info, path=os.path.dirname(output_path))


def _main(p):
  args = p.parse_args()
  _extract_root_entry(args.jar, args.out, args.out_pattern)
  for (e, p) in zip(args.aux, args.aux_patterns):
    _extract_root_entry(args.jar, e, p, touch=True)


parser = argparse.ArgumentParser()

parser.add_argument("--jar", type=_is_jar, required=True)
parser.add_argument("--out", required=True, help="mandatory paths to files that should be extracted from the root")
parser.add_argument("--out_pattern", required=True, help="pattern to match when looking for the output file")
parser.add_argument(
  "--aux", nargs="*",
  help="""paths to files that should be extracted from the root, if the files do not exist they are touched.""")
parser.add_argument("--aux_patterns", nargs="*", help="patterns to match when looking for the auxillary files.")

_main(parser)
