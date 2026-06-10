import { yaml, generateManifest, manifestToSortedJSON } from "@akashnetwork/chain-sdk";
import { buildParallelDeployCards, loadDeployRequirements } from "./lib/sdl-fit.mjs";

const req = loadDeployRequirements();
const card = buildParallelDeployCards(req)[0];
const gpu = card.requirements.gpu;
const sdl = yaml`
---
version: "2.0"
services:
  descai-test-2:
    image: test
    expose:
      - port: 80
        as: 80
        to:
          - global: true
profiles:
  compute:
    descai-test-2:
      resources:
        cpu:
          units: 38
        memory:
          size: 64Gb
        storage:
          - size: 128Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: ${gpu.model}
                  ram: ${gpu.ram}
                  interface: ${gpu.interface}
  placement:
    dcloud:
      pricing:
        descai-test-2:
          denom: uact
          amount: 4666
deployment:
  descai-test-2:
    dcloud:
      profile: descai-test-2
      count: 1
`;

const m = generateManifest(sdl, "mainnet");
if (!m.ok) {
  console.error("manifest failed", m.value);
  process.exit(1);
}

const res = m.value.groups[0]?.services?.[0]?.resources;
console.log("cpu raw", JSON.stringify(res?.cpu, null, 2));
console.log("val type", typeof res?.cpu?.units?.val, res?.cpu?.units?.val?.constructor?.name);

const sorted = manifestToSortedJSON(m.value.groups);
const parsed = JSON.parse(sorted);
const cpuSorted = parsed[0]?.services?.[0]?.resources?.cpu;
console.log("cpu sorted", JSON.stringify(cpuSorted, null, 2));
