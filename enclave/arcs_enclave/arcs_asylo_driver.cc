/*
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

#include <iostream>
#include <fstream>
#include <string>

#include "asylo/client.h"
#include "arcs_enclave/arcs_asylo.pb.h"
#include "gflags/gflags.h"
#include "asylo/util/logging.h"

DEFINE_string(enclave_path, "", "Path to enclave binary image to load");
DEFINE_string(output_file, "", "Path to file to write output to");

// Populates |enclave_input|->value() with |user_message|.
void SetEnclaveUserMessage(asylo::EnclaveInput *enclave_input,
                           const std::string &user_message) {
  arcs::enclave::KeyRequest *user_input =
      enclave_input->MutableExtension(arcs::enclave::arcs_enclave_input);
  user_input->set_value(user_message);
}

int main(int argc, char *argv[]) {
  ::google::ParseCommandLineFlags(&argc, &argv,
                                  /*remove_flags=*/ true);

  // Initialize the enclave
  asylo::EnclaveManager::Configure(asylo::EnclaveManagerOptions());
  auto manager_result = asylo::EnclaveManager::Instance();
  LOG_IF(QFATAL, !manager_result.ok()) << "Could not obtain EnclaveManager";

  asylo::EnclaveManager *manager = manager_result.ValueOrDie();
  std::cout << "Loading enclave at path: " << FLAGS_enclave_path << std::endl;
  asylo::SimLoader loader(FLAGS_enclave_path, /*debug=*/true);
  asylo::Status status = manager->LoadEnclave("arcs_enclave", loader);
  LOG_IF(QFATAL, !status.ok()) << "LoadEnclave failed with: " << status;


  // Execute the enclaved code
  asylo::EnclaveClient *client = manager->GetClient("arcs_enclave");
  asylo::EnclaveInput input;
  SetEnclaveUserMessage(&input, "dummy message");

  asylo::EnclaveOutput output;
  std::cout << "EnterAndRun" << std::endl;
  status = client->EnterAndRun(input, &output);
  LOG_IF(QFATAL, !status.ok()) << "EnterAndRun failed with: " << status;

  std::string output_value =
      output.GetExtension(arcs::enclave::arcs_enclave_output).key();


  // Finalize (teardown) the enclave
  asylo::EnclaveFinal empty_final_input;
  status = manager->DestroyEnclave(client, empty_final_input);
  LOG_IF(QFATAL, !status.ok()) << "DestroyEnclave failed with: " << status;


  // Write output
  std::cout << "Writing output (" << output_value << ") to " <<
      FLAGS_output_file << std::endl;
  std::ofstream output_file;
  output_file.open(FLAGS_output_file);
  output_file << output_value;
  output_file.close();

  return 0;
}
