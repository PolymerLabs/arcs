/*
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

#include <string>

#include "arcs_enclave/arcs_asylo.pb.h"
#include "asylo/trusted_application.h"
#include "asylo/util/cleansing_types.h"

class EnclaveDemo : public asylo::TrustedApplication {
 public:
  EnclaveDemo() = default;

  asylo::Status Run(const asylo::EnclaveInput &input,
          asylo::EnclaveOutput *output) {
    std::string input_value = GetInputValue(input);
    std::cout << "Discarding input value: " << input_value << std::endl;

    std::string result = "abc"; // EncryptMessage(input_value);

    std::cout << "Encrypted message: " << result << std::endl;

    arcs::enclave::KeyResponse *mutable_output =
        output->MutableExtension(arcs::enclave::arcs_enclave_output);
    mutable_output->set_key(result);

    return asylo::Status::OkStatus();
  }

  // Retrieves value from |input|.
  const std::string GetInputValue(const asylo::EnclaveInput &input) {
    return input.GetExtension(arcs::enclave::arcs_enclave_input).value();
  }
};


namespace asylo {

    TrustedApplication *BuildTrustedApplication() { return new EnclaveDemo; }

}  // namespace asylo
