import type { DiscoveredToken, TokenChain, TokenPlatform, TokenSource } from "@/types/token";
import { coinKeyFrom } from "@/utils/tokenNormalization";

type FallbackSeed = {
  symbol: string;
  name: string;
  chain: TokenChain;
  platform: TokenPlatform;
  source: TokenSource;
  address?: string | null;
  price?: number | null;
  priceChange24h?: number | null;
};

const MOLECULE_SEEDS: FallbackSeed[] = [
  { symbol: "$BIO", name: "Bio Protocol", chain: "ethereum", platform: "Molecule", source: "molecule", price: 0.07187, priceChange24h: 6.25 },
  { symbol: "$VITARNA", name: "Artan Bio", chain: "ethereum", platform: "Molecule", source: "molecule", price: 0.623, priceChange24h: 5.47 },
  { symbol: "$RSC", name: "ResearchCoin", chain: "ethereum", platform: "Molecule", source: "molecule", price: 0.2351, priceChange24h: 5.8 }
];

const BIODAO_SEEDS: FallbackSeed[] = [
  {
    symbol: "$PSY",
    name: "PsyDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0x2196b84eace74867b73fb003aff93c11fce1d47a"
  },
  {
    symbol: "$VITA",
    name: "VitaDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0x81f8f0bb1cb2a06649e51913a151f0e7ef6fa321"
  },
  {
    symbol: "$CRYO",
    name: "CryoDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0xf4308b0263723b121056938c2172868e408079d0"
  },
  {
    symbol: "$QBIO",
    name: "Quantum Biology DAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0x3e6a1b21bd267677fa49be6425aebe2fc0f89bde"
  },
  {
    symbol: "$GROW",
    name: "ValleyDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0x761a3557184cbc07b7493da0661c41177b2f97fa"
  },
  {
    symbol: "$CURES",
    name: "Curetopia",
    chain: "solana",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "9qU3LmwKJKT2DJeGPihyTP2jc6pC7ij3hPFeyJVzuksN"
  },
  {
    symbol: "$SPINE",
    name: "SpineDAO",
    chain: "solana",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "spinezMPKxkBpf4Q9xET2587fehM3LuKe4xoAoXtSjR"
  },
  {
    symbol: "$NEURON",
    name: "Cerebrum DAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0xab814ce69e15f6b9660a3b184c0b0c97b9394a6b"
  },
  {
    symbol: "$ATH",
    name: "AthenaDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0xa4ffdf3208f46898ce063e25c1c43056fa754739"
  },
  {
    symbol: "$HAIR",
    name: "HairDAO",
    chain: "ethereum",
    platform: "BioDAO",
    source: "bio_dao_dao",
    address: "0x9ce115f0341ae5dabc8b477b74e83db2018a6f42"
  }
];

const PUMP_SEEDS: FallbackSeed[] = [
  { symbol: "$GE132", name: "GE132", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "81QzJEFYP6RN7RN6VGgkxFVphKQCY7QkjhX28AcSVzRS" },
  { symbol: "$AUTISM", name: "AUTISM", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "m5QXpy513mRHECXA7u7umfsQd12xuiYCyuTv5Z3drug" },
  { symbol: "$CHILL", name: "CHILL", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "h9DzjYqaBRkntYou29rDcapME3Rnk4KudU6denddrug" },
  { symbol: "$UNICORN", name: "UNICORN", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "UkAXRkGUY1tn24R2QoR8NVdA7yVUYUU49iePagmdrug" },
  { symbol: "$DAPOX", name: "DAPOX", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "D4R5AqJGj2XkA8cun8KaL2wP6BF2EYQApuoJDWEkHL21" },
  { symbol: "$FERM", name: "FERM", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "pMc8JLmsGxpZurqQ1Wau5G4eoC8JiUbsT6AjWvEdrug" },
  { symbol: "$NOSLEEP", name: "NOSLEEP", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "CfocQt54WD2RHHPeJzETmwWhrNe5BL2RZTBy7o4W8bjp" },
  { symbol: "$VITALITY", name: "VITALITY", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "fehnZfVKhWR4cPHDEMj2S7NyoewwvKiBbAGm8JFdrug" },
  { symbol: "$HCTZ", name: "HCTZ", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "A5VRX1NQrLLbnsk4JA4v7gmiS3yA8tEpLrF3p1mC1DdJ" },
  { symbol: "$ASGIV", name: "ASGIV", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "KRmAkK9tA9LRzotNG6zBbaGbFTByFRufXivLYJadrug" },
  { symbol: "$RULI", name: "RULI", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "14UKnRvfmDeibLd8MQT1pZJ79Chb3zbrCUqPrie6drug" },
  { symbol: "$QUERTZ", name: "QUERTZ", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "AzB8GjW4pn26btFwpp9VwfMo5G8JnjGuoVL9ir3drug" },
  { symbol: "$LSD", name: "LSD", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "UcqRYpsSSnqod6jTHDY6U5xtsQ3JCxSGV8yrAcqdrug" },
  { symbol: "$BTP", name: "BTP", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "qULQbDqt1KEyB2nuSAJHiEpuQW1cW3DMKjKvSzodrug" },
  { symbol: "$PUSSY", name: "PUSSY", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "5MniXdrkaypWFtATEBo58e8vB1vwmeBPZLmky29fXsR3" },
  { symbol: "$BXB", name: "BXB", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "QDLjPPdaC3SSBczLUpLEpZhQqirKRdkhQPQ2purdrug" },
  { symbol: "$TALON", name: "TALON", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "VbNZPNbaVJBdwzLgwm5tdakozZBkAsWkejY6ziVdrug" },
  { symbol: "$MINO", name: "MINO", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "12vcfjXnPscphivmr9qEPAQKjveoMxXtRjT3ETSadrug" },
  { symbol: "$GLP-1", name: "GLP-1", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "5PPVpb64LwVGvhFX3tSfTnhgJyX2B9MSx8p5DQXLpaSv" },
  { symbol: "$RAPTOR", name: "RAPTOR", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "13SwqaienaSY8whFNidaGBmkFHFsiV6JMHWp9gmHdrug" },
  { symbol: "$ART", name: "ART", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "56dS3NpxdCD5f8Nn8zzUFsZRLvhTe9wxNxucUpedrug" },
  { symbol: "$BLUPILL", name: "BLUPILL", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "drxLcknZZCeKaj1ABMUh4CeCGxYhB5mGihdGSUHdrug" },
  { symbol: "$TB500", name: "TB500", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "FWZjmEukFEJUAw4joukWAuHswJH72XtH4e8TiDbAq9s7" },
  { symbol: "$TRIO", name: "TRIO", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "wWjAK2izXWMnSXBPsm59uq3ishcHW5dh5zENMDrdrug" },
  { symbol: "$TREX", name: "TREX", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "n5NAbEtiGo97trQiZhiS66nsgWo3qQMr6wNTwZmdrug" },
  { symbol: "$GUARANA", name: "GUARANA", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "v3BRNLLeVYVdVh96WBFDtSfxJryDzZ7VYsueW31drug" },
  { symbol: "$OMIGU", name: "OMIGU", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "13BMKyfQC6E7smP8TFxSUfyFg8KxQ6rgoBdZt7XHdrug" },
  { symbol: "$BPC157", name: "BPC157", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "TEvEatVDDF9S6p4rJNzttkGdm2zGrfv56yue5Wsdrug" },
  { symbol: "$TORWOLF", name: "TORWOLF", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "q3ujgE1uByxKnbd6JLZPBa8ZGE2Vhc14jK5Txdrdrug" },
  { symbol: "$EGS", name: "EGS", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "5B9rz8LXB9mcVsv84NFSeNVbP3wULXNr22xxHqndrug" },
  { symbol: "$SCIDOGE", name: "SCIDOGE", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "j6JWeDsWJg4Gg5AudvtppXoTXCKcXLVJMbpJmr5drug" },
  { symbol: "$SEMAX", name: "SEMAX", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "hMWtdWjqjcH6QnXz2ztzaeKLdF7YrFYdw1MXso5drug" },
  { symbol: "$DICLOSOD", name: "DICLOSOD", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "7KuirVQGA7StQkuCEaVtctqcLQAwvn7AVLvHmijiAer2" },
  { symbol: "$DOCS", name: "DOCS", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "XpNZVD21QQpMQ8MLHDcN8AoBvVVHvS6kcwMRpPcdrug" },
  { symbol: "$AMPED", name: "AMPED", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "oPYkqySFM18HabLNYDpwvzwMmJ8RzsFEyVhCyssdrug" },
  { symbol: "$UNIBULL", name: "UNIBULL", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "nwkkMgqDbHnMKG3Redg8NErsQk4NQzJRPjoXKgudrug" },
  { symbol: "$ASTAX", name: "ASTAX", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "SHEE5mm3WQf945TTeyNUiE2Y1h51TLsZRu98Quadrug" },
  { symbol: "$GLY", name: "GLY", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "9ehe3qdi9y1RGsP8Rcr3uMaFC6ZkJzk9vQxMMtCbzzmo" },
  { symbol: "$NOVA", name: "NOVA", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "12SgcGu6n8TTDpt1JgDuUfMta7tkqtogHLHnoSB3drug" },
  { symbol: "$SLIM", name: "SLIM", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "g6D9D4dTQQjSR5DqjJNLEBTRXc52WQgQ2RuNJHEdrug" },
  { symbol: "$RAPADOCS", name: "RAPADOCS", chain: "solana", platform: "Pump.Science", source: "pump_science", address: "Y6maEH3pfdniAvqeQZpSzR7LxskiJRHFdEjeDvqdrug" }
];

const FALLBACK_SEEDS = [...MOLECULE_SEEDS, ...BIODAO_SEEDS, ...PUMP_SEEDS];

const toToken = (seed: FallbackSeed, index: number, timestamp: number): DiscoveredToken => {
  const address = seed.address ?? null;
  const coinKey = address ? coinKeyFrom(seed.chain, address) : null;

  return {
    id: `fallback:${index}:${seed.source}:${seed.symbol}`,
    symbol: seed.symbol.startsWith("$") ? seed.symbol.toUpperCase() : `$${seed.symbol.toUpperCase()}`,
    name: seed.name,
    address,
    chain: seed.chain,
    coinKey,
    platform: seed.platform,
    platforms: [seed.platform],
    sources: [seed.source],
    discoveryTimestamp: timestamp,
    marketSeed:
      seed.price != null || seed.priceChange24h != null
        ? {
            price: seed.price ?? null,
            priceChange24h: seed.priceChange24h ?? null,
            fdv: null,
            marketCap: null,
            volume24h: null,
            timestampMs: timestamp
          }
        : undefined
  };
};

export const fallbackDiscoveredTokens = (): DiscoveredToken[] => {
  const timestamp = Date.now();
  return FALLBACK_SEEDS.map((seed, index) => toToken(seed, index, timestamp));
};
