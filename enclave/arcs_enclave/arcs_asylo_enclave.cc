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
#include <random>

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

    std::string result = GetRandom(); //"abc";

    arcs::enclave::KeyResponse *mutable_output =
        output->MutableExtension(arcs::enclave::arcs_enclave_output);
    mutable_output->set_key(result);

    return asylo::Status::OkStatus();
  }

  // Retrieves value from |input|.
  const std::string GetInputValue(const asylo::EnclaveInput &input) {
    return input.GetExtension(arcs::enclave::arcs_enclave_input).value();
  }

  // Generate a random number.
  // TODO - we may be able to depend on good hardware availability (see
  // below), or perhaps good techniques can make this more secure even with
  // PRNG (see https://www.veracrypt.fr/en/Random%20Number%20Generator.html).
  const std::string GetRandom() {

      // TODO I've assumed (but in no way checked) that Asylo will provide a
      // good random device when available.
      std::random_device r;
      std::default_random_engine engine(r());
      std::uniform_int_distribution<unsigned int> uniform(0, 1<<16);

      // concat a few random numbers into an impressive-looking hex string
      const int iterations = 8;
      std::unique_ptr<char[]> buf(new char[4*iterations+1]);
      for (int i=0; i<iterations; i++) {
          unsigned int r = uniform(engine);

          std::string str = std::to_string(r);

          snprintf(buf.get() + 4*i, 5, "%04X", r);
      }

      std::cout << "After " << iterations << " iterations " << buf.get() << std::endl;

      return buf.get();
  }
};


namespace asylo {

    TrustedApplication *BuildTrustedApplication() { return new EnclaveDemo; }

}  // namespace asylo
