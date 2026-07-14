import type { Lang } from "@/i18n";

export interface ProductText {
  name: string;
  tagline: string;
  size: string;
  description: string;
  highlights: string[];
  composition: string[];
  usage: string;
  indication: string;
}

export interface Product {
  id: number;
  slug: string;
  image: string;
  category: CategoryId;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  featured?: boolean;
  badge?: "bestSeller" | "new";
  hero?: { order: number; accent: string };
  i18n: Record<Lang, ProductText>;
}

export type CategoryId =
  | "imunidade"
  | "beleza"
  | "energia"
  | "equilibrio"
  | "detox"
  | "saude";

export interface Category {
  id: CategoryId;
  name: Record<Lang, string>;
  blurb: Record<Lang, string>;
  icon: "shield" | "sparkles" | "flame" | "leaf" | "droplets" | "heart";
  accent: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "imunidade",
    icon: "shield",
    accent: "#5f7261",
    name: { pt: "Imunidade & Vitaminas", en: "Immunity & Vitamins" },
    blurb: {
      pt: "Defesas fortes e reposição de nutrientes essenciais.",
      en: "Strong defenses and essential nutrient replenishment.",
    },
  },
  {
    id: "beleza",
    icon: "sparkles",
    accent: "#cdb59b",
    name: { pt: "Beleza & Colágeno", en: "Beauty & Collagen" },
    blurb: {
      pt: "Pele, cabelo, unhas e sustentação de dentro para fora.",
      en: "Skin, hair, nails and support from within.",
    },
  },
  {
    id: "energia",
    icon: "flame",
    accent: "#b0906b",
    name: { pt: "Energia & Performance", en: "Energy & Performance" },
    blurb: {
      pt: "Disposição, foco e vitalidade para render mais.",
      en: "Drive, focus and vitality to perform more.",
    },
  },
  {
    id: "equilibrio",
    icon: "leaf",
    accent: "#95a48e",
    name: { pt: "Equilíbrio & Bem-estar", en: "Balance & Wellbeing" },
    blurb: {
      pt: "Sono, humor, minerais e serenidade para a rotina.",
      en: "Sleep, mood, minerals and calm for your routine.",
    },
  },
  {
    id: "detox",
    icon: "droplets",
    accent: "#7e9280",
    name: { pt: "Detox & Peso", en: "Detox & Weight" },
    blurb: {
      pt: "Leveza, saciedade e reeducação alimentar.",
      en: "Lightness, satiety and mindful eating.",
    },
  },
  {
    id: "saude",
    icon: "heart",
    accent: "#b99b7b",
    name: { pt: "Saúde Dela & Dele", en: "Her & His Health" },
    blurb: {
      pt: "Cuidado natural para o bem-estar feminino e masculino.",
      en: "Natural care for women's and men's wellbeing.",
    },
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    slug: "dermemax-1000",
    image: "/products/dermemax-1000.webp",
    category: "beleza",
    price: 99.9,
    compareAt: 129.9,
    rating: 4.9,
    reviews: 312,
    featured: true,
    badge: "bestSeller",
    hero: { order: 1, accent: "#cdb59b" },
    i18n: {
      pt: {
        name: "Dermemax 1000 — Colágeno + Vitamina C",
        tagline: "Firmeza, sustentação e beleza de dentro para fora",
        size: "120 comprimidos · 1000mg",
        description:
          "Colágeno hidrolisado com vitamina C, que participa da formação normal do colágeno no organismo. Cuidado diário com a pele, firmeza e sustentação, de forma simples e prática.",
        highlights: [
          "Colágeno hidrolisado + vitamina C",
          "A vitamina C auxilia na formação do colágeno",
          "Cuidado com a pele e firmeza",
          "Uso diário prático",
          "120 comprimidos de 1000mg",
        ],
        composition: ["Colágeno hidrolisado", "Ácido ascórbico (vitamina C)"],
        usage:
          "Consumir 4 comprimidos, 3 vezes ao dia, para adultos a partir de 19 anos.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "Dermemax 1000 — Collagen + Vitamin C",
        tagline: "Firmness, support and beauty from within",
        size: "120 tablets · 1000mg",
        description:
          "Hydrolyzed collagen with vitamin C, which contributes to normal collagen formation in the body. Daily care for skin, firmness and support, made simple and practical.",
        highlights: [
          "Hydrolyzed collagen + vitamin C",
          "Vitamin C supports collagen formation",
          "Skin care and firmness",
          "Practical daily use",
          "120 tablets of 1000mg",
        ],
        composition: ["Hydrolyzed collagen", "Ascorbic acid (vitamin C)"],
        usage: "Take 4 tablets, 3 times a day, for adults from 19 years.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 2,
    slug: "uc-flex-ii",
    image: "/products/uc-flex-ii.webp",
    category: "beleza",
    price: 119.9,
    compareAt: 149.9,
    rating: 4.8,
    reviews: 96,
    featured: true,
    badge: "new",
    hero: { order: 2, accent: "#95a48e" },
    i18n: {
      pt: {
        name: "UC Flex II — Ultra-Colágeno Tipo 2",
        tagline: "Articulações, flexibilidade e sustentação",
        size: "60 comprimidos · 1000mg",
        description:
          "Colágeno tipo 2 com vitamina D3, vitamina K2 e malato de magnésio. Fórmula avançada para o cuidado das articulações, flexibilidade e sustentação do corpo.",
        highlights: [
          "Colágeno tipo 2",
          "Vitamina D3 + Vitamina K2",
          "Malato de magnésio",
          "Cuidado das articulações",
          "60 comprimidos de 1000mg",
        ],
        composition: [
          "Colágeno tipo 2",
          "Vitamina D3",
          "Vitamina K2",
          "Malato de magnésio",
        ],
        usage: "Consumir conforme a orientação da embalagem.",
        indication: "Adultos que buscam cuidado com as articulações.",
      },
      en: {
        name: "UC Flex II — Ultra Collagen Type 2",
        tagline: "Joints, flexibility and support",
        size: "60 tablets · 1000mg",
        description:
          "Type 2 collagen with vitamin D3, vitamin K2 and magnesium malate. An advanced formula to care for joints, flexibility and body support.",
        highlights: [
          "Type 2 collagen",
          "Vitamin D3 + Vitamin K2",
          "Magnesium malate",
          "Joint care",
          "60 tablets of 1000mg",
        ],
        composition: [
          "Type 2 collagen",
          "Vitamin D3",
          "Vitamin K2",
          "Magnesium malate",
        ],
        usage: "Take as directed on the label.",
        indication: "Adults seeking joint care.",
      },
    },
  },
  {
    id: 3,
    slug: "natus-viton-imuno",
    image: "/products/natus-viton-imuno.webp",
    category: "imunidade",
    price: 49.9,
    compareAt: 64.9,
    rating: 4.8,
    reviews: 274,
    featured: true,
    badge: "bestSeller",
    hero: { order: 3, accent: "#7e9280" },
    i18n: {
      pt: {
        name: "Natus Viton Imuno — Vitamina C + D + Zinco",
        tagline: "Reforço diário para a sua imunidade",
        size: "60 comprimidos · zero açúcar",
        description:
          "Trio clássico de Vitamina C, Vitamina D e Zinco para dar suporte às defesas do organismo. Fórmula prática e zero açúcar para manter o cuidado com a imunidade sempre em dia.",
        highlights: [
          "Vitamina C + Vitamina D + Zinco",
          "Suporte à imunidade",
          "Ação antioxidante",
          "Zero açúcar",
          "60 comprimidos",
        ],
        composition: ["Vitamina C", "Vitamina D", "Zinco"],
        usage: "Consumir 2 comprimidos ao dia.",
        indication: "Adultos e jovens a partir de 9 anos.",
      },
      en: {
        name: "Natus Viton Imuno — Vitamin C + D + Zinc",
        tagline: "A daily boost for your immunity",
        size: "60 tablets · zero sugar",
        description:
          "The classic trio of Vitamin C, Vitamin D and Zinc to support your body's defenses. A practical, zero-sugar formula to keep your immunity care on track.",
        highlights: [
          "Vitamin C + Vitamin D + Zinc",
          "Immune support",
          "Antioxidant action",
          "Zero sugar",
          "60 tablets",
        ],
        composition: ["Vitamin C", "Vitamin D", "Zinc"],
        usage: "Take 2 tablets a day.",
        indication: "Adults and teens from 9 years.",
      },
    },
  },
  {
    id: 4,
    slug: "6mags",
    image: "/products/6mags.webp",
    category: "equilibrio",
    price: 74.9,
    compareAt: 94.9,
    rating: 4.9,
    reviews: 188,
    featured: true,
    badge: "bestSeller",
    hero: { order: 4, accent: "#a7b0a2" },
    i18n: {
      pt: {
        name: "6Mags — 6 Magnésios em um só produto",
        tagline: "Seis formas de magnésio para equilíbrio total",
        size: "60 cápsulas · 500mg",
        description:
          "Reúne seis formas de magnésio — citrato, hidróxido, óxido, taurato, malato e bisglicinato — para apoiar a função muscular, a energia e o equilíbrio do organismo.",
        highlights: [
          "6 formas de magnésio em uma cápsula",
          "Citrato, malato, taurato e bisglicinato",
          "Suporte muscular e energia",
          "Equilíbrio do organismo",
          "60 cápsulas de 500mg",
        ],
        composition: [
          "Citrato de magnésio",
          "Hidróxido de magnésio",
          "Óxido de magnésio",
          "Taurato de magnésio",
          "Malato de magnésio",
          "Bisglicinato de magnésio",
        ],
        usage: "Ingerir 2 cápsulas ao dia, ou conforme orientação.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "6Mags — 6 Magnesiums in one",
        tagline: "Six forms of magnesium for total balance",
        size: "60 capsules · 500mg",
        description:
          "Combines six forms of magnesium — citrate, hydroxide, oxide, taurate, malate and bisglycinate — to support muscle function, energy and overall balance.",
        highlights: [
          "6 forms of magnesium in one capsule",
          "Citrate, malate, taurate and bisglycinate",
          "Muscle and energy support",
          "Overall balance",
          "60 capsules of 500mg",
        ],
        composition: [
          "Magnesium citrate",
          "Magnesium hydroxide",
          "Magnesium oxide",
          "Magnesium taurate",
          "Magnesium malate",
          "Magnesium bisglycinate",
        ],
        usage: "Take 2 capsules a day, or as advised.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 5,
    slug: "coq10",
    image: "/products/coq10.webp",
    category: "energia",
    price: 129.9,
    compareAt: 159.9,
    rating: 4.9,
    reviews: 143,
    featured: true,
    badge: "bestSeller",
    hero: { order: 5, accent: "#c7a98a" },
    i18n: {
      pt: {
        name: "CoQ10 Ubiquinona — Energia Celular",
        tagline: "Vitalidade, disposição e ação antioxidante",
        size: "60 cápsulas softgel · 200mg",
        description:
          "Coenzima Q10 em cápsulas softgel para apoiar a produção de energia celular, a vitalidade e a saúde cardiovascular, com ação antioxidante contra os radicais livres.",
        highlights: [
          "200 mg de CoQ10 por porção",
          "Energia celular e vitalidade",
          "Ação antioxidante",
          "Apoio à saúde cardiovascular",
          "60 cápsulas softgel",
        ],
        composition: ["Coenzima Q10 (ubiquinona)"],
        usage: "Consumir 2 cápsulas ao dia.",
        indication: "Adultos. Não indicado para gestantes e lactantes.",
      },
      en: {
        name: "CoQ10 Ubiquinone — Cellular Energy",
        tagline: "Vitality, energy and antioxidant action",
        size: "60 softgels · 200mg",
        description:
          "Coenzyme Q10 in softgels to support cellular energy production, vitality and cardiovascular health, with antioxidant action against free radicals.",
        highlights: [
          "200 mg of CoQ10 per serving",
          "Cellular energy and vitality",
          "Antioxidant action",
          "Cardiovascular support",
          "60 softgels",
        ],
        composition: ["Coenzyme Q10 (ubiquinone)"],
        usage: "Take 2 capsules a day.",
        indication: "Adults. Not for pregnant or nursing women.",
      },
    },
  },
  {
    id: 6,
    slug: "keratin-maxx",
    image: "/products/keratin-maxx.webp",
    category: "beleza",
    price: 89.9,
    compareAt: 119.9,
    rating: 4.7,
    reviews: 205,
    featured: true,
    badge: "bestSeller",
    i18n: {
      pt: {
        name: "Keratin Maxx — Cabelo, Pele & Unhas",
        tagline: "Beleza de dentro para fora com colágeno e vitaminas",
        size: "Beleza · cabelo, pele e unhas",
        description:
          "Fórmula completa que reúne colágeno hidrolisado, vitaminas, minerais e aminoácidos para fortalecer os fios, dar resistência às unhas e apoiar a saúde da pele — beleza de dentro para fora.",
        highlights: [
          "Colágeno hidrolisado + biotina",
          "Zinco, selênio e silício",
          "Vitaminas A, C, E e complexo B",
          "Fortalece cabelo e unhas",
          "Aminoácidos essenciais para os fios",
        ],
        composition: [
          "Colágeno hidrolisado",
          "L-metionina, L-cisteína, L-lisina",
          "Biotina",
          "Zinco, selênio e silício",
          "Vitaminas A, C, E e complexo B",
        ],
        usage: "Consumir conforme a orientação da embalagem ou de um profissional.",
        indication: "Quem busca fortalecer cabelos, unhas e cuidar da pele.",
      },
      en: {
        name: "Keratin Maxx — Hair, Skin & Nails",
        tagline: "Beauty from within with collagen and vitamins",
        size: "Beauty · hair, skin and nails",
        description:
          "A complete formula combining hydrolyzed collagen, vitamins, minerals and amino acids to strengthen hair, toughen nails and support skin health — beauty from the inside out.",
        highlights: [
          "Hydrolyzed collagen + biotin",
          "Zinc, selenium and silicon",
          "Vitamins A, C, E and B-complex",
          "Strengthens hair and nails",
          "Essential amino acids for hair",
        ],
        composition: [
          "Hydrolyzed collagen",
          "L-methionine, L-cysteine, L-lysine",
          "Biotin",
          "Zinc, selenium and silicon",
          "Vitamins A, C, E and B-complex",
        ],
        usage: "Take as directed on the label or by a professional.",
        indication: "Anyone looking to strengthen hair, nails and care for skin.",
      },
    },
  },
  {
    id: 7,
    slug: "triptofano",
    image: "/products/triptofano.webp",
    category: "equilibrio",
    price: 74.9,
    rating: 4.8,
    reviews: 167,
    featured: true,
    i18n: {
      pt: {
        name: "Triptofano — L-Triptofano + Vitamina B6",
        tagline: "Equilíbrio, relaxamento e noites mais tranquilas",
        size: "60 cápsulas",
        description:
          "L-triptofano com vitamina B6 para apoiar o bem-estar emocional, o relaxamento e a qualidade do descanso. Um aliado para desacelerar em rotinas intensas.",
        highlights: [
          "L-triptofano + vitamina B6",
          "Apoio ao bem-estar e ao humor",
          "Favorece o relaxamento e o sono",
          "Não contém glúten",
          "60 cápsulas",
        ],
        composition: ["L-triptofano", "Vitamina B6"],
        usage: "Tomar 1 cápsula ao dia.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "Tryptophan — L-Tryptophan + Vitamin B6",
        tagline: "Balance, relaxation and calmer nights",
        size: "60 capsules",
        description:
          "L-tryptophan with vitamin B6 to support emotional wellbeing, relaxation and restful sleep. An ally to unwind in busy routines.",
        highlights: [
          "L-tryptophan + vitamin B6",
          "Supports wellbeing and mood",
          "Promotes relaxation and sleep",
          "Gluten free",
          "60 capsules",
        ],
        composition: ["L-tryptophan", "Vitamin B6"],
        usage: "Take 1 capsule a day.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 8,
    slug: "omegas-femme",
    image: "/products/omegas-femme.webp",
    category: "saude",
    price: 79.9,
    rating: 4.7,
    reviews: 118,
    featured: true,
    i18n: {
      pt: {
        name: "Ômegas Femme 3-6-9 + Vitamina E",
        tagline: "Gorduras boas e bem-estar feminino",
        size: "60 cápsulas · 1400mg",
        description:
          "Óleo de linhaça, prímula e borragem com vitamina E antioxidante. Fonte de ômega 3, 6 e 9 pensada para o autocuidado e o equilíbrio feminino no dia a dia.",
        highlights: [
          "Óleo de linhaça, prímula e borragem",
          "Fonte de ômega 3, 6 e 9",
          "Com vitamina E antioxidante",
          "Voltado ao bem-estar feminino",
          "60 cápsulas de 1400mg",
        ],
        composition: [
          "Óleo de linhaça",
          "Óleo de prímula",
          "Óleo de borragem",
          "Vitamina E",
        ],
        usage: "Ingerir 5 cápsulas ao dia.",
        indication: "Mulheres adultas a partir de 19 anos.",
      },
      en: {
        name: "Ômegas Femme 3-6-9 + Vitamin E",
        tagline: "Good fats and women's wellbeing",
        size: "60 capsules · 1400mg",
        description:
          "Flaxseed, evening primrose and borage oils with antioxidant vitamin E. A source of omega 3, 6 and 9 designed for women's self-care and everyday balance.",
        highlights: [
          "Flaxseed, evening primrose and borage oil",
          "Source of omega 3, 6 and 9",
          "With antioxidant vitamin E",
          "For women's wellbeing",
          "60 capsules of 1400mg",
        ],
        composition: [
          "Flaxseed oil",
          "Evening primrose oil",
          "Borage oil",
          "Vitamin E",
        ],
        usage: "Take 5 capsules a day.",
        indication: "Adult women from 19 years.",
      },
    },
  },
  {
    id: 9,
    slug: "top-reduxx",
    image: "/products/top-reduxx.webp",
    category: "detox",
    price: 89.9,
    compareAt: 109.9,
    rating: 4.6,
    reviews: 231,
    badge: "bestSeller",
    i18n: {
      pt: {
        name: "Top Reduxx — Saciedade & Metabolismo",
        tagline: "Controle da fome e apoio ao emagrecimento",
        size: "60 cápsulas · zero açúcar",
        description:
          "Fórmula com psyllium, espirulina, cromo, FOS, polidextrose e cafeína, pensada para aumentar a saciedade, apoiar o metabolismo e acompanhar estratégias de reeducação alimentar.",
        highlights: [
          "Psyllium, espirulina e picolinato de cromo",
          "FOS, polidextrose e cafeína",
          "Favorece a saciedade",
          "Zero açúcar · sem lactose",
          "60 cápsulas",
        ],
        composition: [
          "Psyllium",
          "Espirulina",
          "Picolinato de cromo",
          "Polidextrose",
          "FOS",
          "Cafeína",
        ],
        usage:
          "Ingerir 2 cápsulas ao dia, antes das principais refeições, com líquido.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "Top Reduxx — Satiety & Metabolism",
        tagline: "Appetite control and weight-loss support",
        size: "60 capsules · zero sugar",
        description:
          "A formula with psyllium, spirulina, chromium, FOS, polydextrose and caffeine, designed to boost satiety, support metabolism and complement a mindful-eating routine.",
        highlights: [
          "Psyllium, spirulina and chromium picolinate",
          "FOS, polydextrose and caffeine",
          "Promotes satiety",
          "Zero sugar · lactose free",
          "60 capsules",
        ],
        composition: [
          "Psyllium",
          "Spirulina",
          "Chromium picolinate",
          "Polydextrose",
          "FOS",
          "Caffeine",
        ],
        usage: "Take 2 capsules a day before main meals, with liquid.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 10,
    slug: "natus-viton-az",
    image: "/products/natus-viton-az.webp",
    category: "imunidade",
    price: 59.9,
    rating: 4.7,
    reviews: 156,
    i18n: {
      pt: {
        name: "Natus Viton A-Z — Polivitamínico",
        tagline: "Vitaminas e minerais essenciais para o seu dia a dia",
        size: "120 cápsulas",
        description:
          "Polivitamínico completo com A, C, D3, E, K2 e complexo B, além de zinco, selênio, magnésio, cálcio e ferro. O reforço nutricional ideal para rotinas intensas.",
        highlights: [
          "Vitaminas A, C, D3, E, K2 e complexo B",
          "Minerais: zinco, selênio, magnésio, cálcio e ferro",
          "Suporte à imunidade e disposição",
          "Praticidade para a rotina",
          "120 cápsulas",
        ],
        composition: [
          "Vitaminas A, C, D3, E, K2",
          "Complexo B",
          "Zinco, selênio, magnésio",
          "Cálcio, ferro, cromo, iodo e fósforo",
        ],
        usage: "Ingerir 2 cápsulas ao dia, ou conforme orientação profissional.",
        indication: "Adultos e jovens a partir de 9 anos.",
      },
      en: {
        name: "Natus Viton A-Z — Multivitamin",
        tagline: "Essential vitamins and minerals for everyday life",
        size: "120 capsules",
        description:
          "A complete multivitamin with A, C, D3, E, K2 and B-complex, plus zinc, selenium, magnesium, calcium and iron. The ideal nutritional boost for busy routines.",
        highlights: [
          "Vitamins A, C, D3, E, K2 and B-complex",
          "Minerals: zinc, selenium, magnesium, calcium and iron",
          "Supports immunity and energy",
          "Practical for daily life",
          "120 capsules",
        ],
        composition: [
          "Vitamins A, C, D3, E, K2",
          "B-complex",
          "Zinc, selenium, magnesium",
          "Calcium, iron, chromium, iodine and phosphorus",
        ],
        usage: "Take 2 capsules a day, or as professionally advised.",
        indication: "Adults and teens from 9 years.",
      },
    },
  },
  {
    id: 11,
    slug: "ther-maniac",
    image: "/products/ther-maniac.webp",
    category: "energia",
    price: 84.9,
    rating: 4.6,
    reviews: 134,
    i18n: {
      pt: {
        name: "Ther Maniac — Pré-treino em Cápsulas",
        tagline: "Energia, foco e intensidade para render mais",
        size: "90 cápsulas",
        description:
          "Pré-treino em cápsulas com cafeína, arginina, taurina, L-carnitina e cromo. Feito para quem busca mais energia, foco e disposição nos treinos e nos dias puxados.",
        highlights: [
          "Cafeína + arginina + taurina",
          "L-carnitina e picolinato de cromo",
          "Energia, foco e intensidade",
          "Pré-treino prático em cápsulas",
          "90 cápsulas",
        ],
        composition: [
          "Cafeína",
          "Arginina",
          "Taurina",
          "L-carnitina",
          "Picolinato de cromo",
        ],
        usage: "Consumir 1 cápsula, 3 vezes ao dia, no período diurno.",
        indication: "Adultos com rotina ativa. Contém cafeína.",
      },
      en: {
        name: "Ther Maniac — Pre-workout Capsules",
        tagline: "Energy, focus and intensity to perform more",
        size: "90 capsules",
        description:
          "Pre-workout capsules with caffeine, arginine, taurine, L-carnitine and chromium. Made for those who want more energy, focus and drive in training and demanding days.",
        highlights: [
          "Caffeine + arginine + taurine",
          "L-carnitine and chromium picolinate",
          "Energy, focus and intensity",
          "Practical pre-workout in capsules",
          "90 capsules",
        ],
        composition: [
          "Caffeine",
          "Arginine",
          "Taurine",
          "L-carnitine",
          "Chromium picolinate",
        ],
        usage: "Take 1 capsule, 3 times a day, during daytime.",
        indication: "Active adults. Contains caffeine.",
      },
    },
  },
  {
    id: 12,
    slug: "natuprost",
    image: "/products/natuprost.webp",
    category: "saude",
    price: 79.9,
    compareAt: 99.9,
    rating: 4.7,
    reviews: 142,
    i18n: {
      pt: {
        name: "NatuProst — Óleo de Semente de Abóbora",
        tagline: "Suporte natural para a próstata e o conforto urinário",
        size: "60 cápsulas · 1000mg",
        description:
          "Suplemento à base de óleo de semente de abóbora, tradicionalmente usado no cuidado com a próstata, o trato urinário e o bem-estar masculino. Uma opção prática para homens após os 40.",
        highlights: [
          "Óleo de semente de abóbora",
          "1000 mg por cápsula",
          "Voltado ao bem-estar masculino",
          "Não contém glúten",
          "60 cápsulas",
        ],
        composition: ["Óleo de semente de abóbora"],
        usage: "Tomar 5 cápsulas ao dia, divididas antes das principais refeições.",
        indication: "Homens adultos, especialmente a partir dos 40 anos.",
      },
      en: {
        name: "NatuProst — Pumpkin Seed Oil",
        tagline: "Natural support for prostate and urinary comfort",
        size: "60 capsules · 1000mg",
        description:
          "A pumpkin seed oil supplement traditionally used to support the prostate, urinary tract and male wellbeing. A practical choice for men over 40.",
        highlights: [
          "Pumpkin seed oil",
          "1000 mg per capsule",
          "For male wellbeing",
          "Gluten free",
          "60 capsules",
        ],
        composition: ["Pumpkin seed oil"],
        usage: "Take 5 capsules a day, split before main meals.",
        indication: "Adult men, especially from 40 years.",
      },
    },
  },
  {
    id: 13,
    slug: "curcuma-magnesio-msm",
    image: "/products/curcuma-magnesio-msm.webp",
    category: "equilibrio",
    price: 69.9,
    rating: 4.7,
    reviews: 109,
    i18n: {
      pt: {
        name: "Cúrcuma + Magnésio + MSM",
        tagline: "Mobilidade, conforto articular e equilíbrio muscular",
        size: "60 cápsulas",
        description:
          "Combinação estratégica de magnésio bisglicinato, cúrcuma e MSM para apoiar a mobilidade, o conforto articular e o equilíbrio muscular no dia a dia — ideal para quem tem rotina ativa.",
        highlights: [
          "Magnésio bisglicinato + Cúrcuma + MSM",
          "Apoio à mobilidade e articulações",
          "Suporte muscular no dia a dia",
          "Não contém glúten",
          "60 cápsulas",
        ],
        composition: [
          "Magnésio bisglicinato",
          "Cúrcuma",
          "MSM (metilsulfonilmetano)",
        ],
        usage: "Ingerir 2 cápsulas ao dia.",
        indication: "Adultos maiores de 19 anos.",
      },
      en: {
        name: "Turmeric + Magnesium + MSM",
        tagline: "Mobility, joint comfort and muscle balance",
        size: "60 capsules",
        description:
          "A strategic blend of magnesium bisglycinate, turmeric and MSM to support mobility, joint comfort and muscle balance every day — ideal for active routines.",
        highlights: [
          "Magnesium bisglycinate + Turmeric + MSM",
          "Supports mobility and joints",
          "Everyday muscle support",
          "Gluten free",
          "60 capsules",
        ],
        composition: [
          "Magnesium bisglycinate",
          "Turmeric",
          "MSM (methylsulfonylmethane)",
        ],
        usage: "Take 2 capsules a day.",
        indication: "Adults over 19 years.",
      },
    },
  },
  {
    id: 14,
    slug: "cranberry",
    image: "/products/cranberry.webp",
    category: "imunidade",
    price: 64.9,
    rating: 4.6,
    reviews: 88,
    i18n: {
      pt: {
        name: "Cranberry — Vitamina A, Zinco & Selênio",
        tagline: "Autocuidado e trato urinário em cápsulas práticas",
        size: "60 cápsulas",
        description:
          "Extrato de cranberry com vitamina A, zinco, selênio e proantocianidinas. Uma forma prática de incluir o cranberry e micronutrientes essenciais na rotina.",
        highlights: [
          "Cranberry + vitamina A + zinco + selênio",
          "Contém proantocianidinas",
          "Autocuidado prático",
          "Não contém glúten",
          "60 cápsulas",
        ],
        composition: [
          "Extrato de cranberry em pó",
          "Bisglicinato de zinco",
          "Acetato de retinol (vit. A)",
          "L-selenometionina",
        ],
        usage: "Consumir 1 cápsula, 2 vezes ao dia.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "Cranberry — Vitamin A, Zinc & Selenium",
        tagline: "Self-care and urinary tract in practical capsules",
        size: "60 capsules",
        description:
          "Cranberry extract with vitamin A, zinc, selenium and proanthocyanidins. A practical way to add cranberry and essential micronutrients to your routine.",
        highlights: [
          "Cranberry + vitamin A + zinc + selenium",
          "Contains proanthocyanidins",
          "Practical self-care",
          "Gluten free",
          "60 capsules",
        ],
        composition: [
          "Cranberry powder extract",
          "Zinc bisglycinate",
          "Retinol acetate (vit. A)",
          "L-selenomethionine",
        ],
        usage: "Take 1 capsule, twice a day.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 15,
    slug: "feno-grego",
    image: "/products/feno-grego.webp",
    category: "energia",
    price: 69.9,
    rating: 4.6,
    reviews: 77,
    i18n: {
      pt: {
        name: "Feno Grego + Boro + Zinco",
        tagline: "Vitalidade, performance e suporte nutricional",
        size: "60 cápsulas · 50% saponinas",
        description:
          "Feno grego padronizado em 50% de saponinas com zinco e boro. Fórmula voltada a quem busca mais disposição, vitalidade e reforço na rotina de treino.",
        highlights: [
          "Feno grego com 50% de saponinas",
          "Com boro + zinco",
          "Vitalidade e performance",
          "Não contém glúten",
          "60 cápsulas de 500mg",
        ],
        composition: [
          "Feno grego",
          "Bisglicinato de zinco",
          "Tetraborato de sódio (boro)",
        ],
        usage: "Ingerir 2 cápsulas ao dia.",
        indication: "Adultos. Não indicado para gestantes e lactantes.",
      },
      en: {
        name: "Fenugreek + Boron + Zinc",
        tagline: "Vitality, performance and nutritional support",
        size: "60 capsules · 50% saponins",
        description:
          "Fenugreek standardized to 50% saponins with zinc and boron. A formula for those seeking more energy, vitality and support in their training routine.",
        highlights: [
          "Fenugreek with 50% saponins",
          "With boron + zinc",
          "Vitality and performance",
          "Gluten free",
          "60 capsules of 500mg",
        ],
        composition: [
          "Fenugreek",
          "Zinc bisglycinate",
          "Sodium tetraborate (boron)",
        ],
        usage: "Take 2 capsules a day.",
        indication: "Adults. Not for pregnant or nursing women.",
      },
    },
  },
  {
    id: 16,
    slug: "dimalato",
    image: "/products/dimalato.webp",
    category: "energia",
    price: 59.9,
    rating: 4.7,
    reviews: 95,
    i18n: {
      pt: {
        name: "Dimalato — Magnésio Dimalato",
        tagline: "Energia e disposição para o corpo em movimento",
        size: "60 cápsulas · 500mg",
        description:
          "Magnésio dimalato em cápsulas, forma muito procurada por quem busca energia, disposição e suporte à função muscular na rotina ativa.",
        highlights: [
          "Magnésio dimalato",
          "Energia e disposição",
          "Suporte à função muscular",
          "Prático para o dia a dia",
          "60 cápsulas de 500mg",
        ],
        composition: ["Magnésio dimalato"],
        usage: "Ingerir 2 cápsulas ao dia.",
        indication: "Adultos a partir de 19 anos.",
      },
      en: {
        name: "Dimalato — Magnesium Dimalate",
        tagline: "Energy and drive for a body in motion",
        size: "60 capsules · 500mg",
        description:
          "Magnesium dimalate in capsules, a form favored by those seeking energy, drive and muscle-function support in an active routine.",
        highlights: [
          "Magnesium dimalate",
          "Energy and drive",
          "Muscle-function support",
          "Practical for daily use",
          "60 capsules of 500mg",
        ],
        composition: ["Magnesium dimalate"],
        usage: "Take 2 capsules a day.",
        indication: "Adults from 19 years.",
      },
    },
  },
  {
    id: 17,
    slug: "natusmel",
    image: "/products/natusmel.webp",
    category: "imunidade",
    price: 44.9,
    rating: 4.8,
    reviews: 124,
    i18n: {
      pt: {
        name: "Natusmel — Mel, Própolis & Ervas",
        tagline: "Conforto para a garganta e bem-estar respiratório",
        size: "420 g",
        description:
          "Composto de mel e própolis enriquecido com agrião, romã, eucalipto, malva, limão, alho, poejo e copaíba. Sabor agradável e cuidado tradicional para a garganta em dias secos ou frios.",
        highlights: [
          "Mel + própolis + blend de ervas",
          "Conforto para a garganta",
          "Ideal para clima seco e frio",
          "Pronto para consumo",
          "420 g",
        ],
        composition: [
          "Mel",
          "Extrato de própolis",
          "Agrião, romã, eucalipto",
          "Malva, limão, alho, poejo e copaíba",
        ],
        usage: "Consumir conforme a preferência e a orientação da embalagem.",
        indication: "Não indicado para crianças menores de 1 ano.",
      },
      en: {
        name: "Natusmel — Honey, Propolis & Herbs",
        tagline: "Throat comfort and respiratory wellbeing",
        size: "420 g",
        description:
          "A honey and propolis blend enriched with watercress, pomegranate, eucalyptus, mallow, lemon, garlic, pennyroyal and copaiba. A pleasant taste and traditional throat care for dry or cold days.",
        highlights: [
          "Honey + propolis + herbal blend",
          "Throat comfort",
          "Ideal for dry and cold weather",
          "Ready to use",
          "420 g",
        ],
        composition: [
          "Honey",
          "Propolis extract",
          "Watercress, pomegranate, eucalyptus",
          "Mallow, lemon, garlic, pennyroyal and copaiba",
        ],
        usage: "Use as preferred and directed on the label.",
        indication: "Not for children under 1 year.",
      },
    },
  },
  {
    id: 18,
    slug: "nutri-natus-amargo",
    image: "/products/nutri-natus-amargo.webp",
    category: "detox",
    price: 39.9,
    rating: 4.5,
    reviews: 66,
    i18n: {
      pt: {
        name: "Nutri Natus Amargo — Chá Funcional",
        tagline: "Camomila, carqueja, chá verde e hortelã, prontos para beber",
        size: "500 ml · pronto para consumo",
        description:
          "Chá pronto para consumo com camomila, carqueja, chá verde e hortelã. Uma opção leve e prática para acompanhar momentos de leveza, digestão e organização alimentar.",
        highlights: [
          "Camomila, carqueja, chá verde e hortelã",
          "Pronto para beber",
          "Sensação de leveza e bem-estar",
          "Não contém glúten",
          "500 ml",
        ],
        composition: ["Camomila", "Carqueja", "Chá verde", "Hortelã"],
        usage: "Produto pronto para consumo. Agite antes de beber.",
        indication: "Uso geral. Conservar em local fresco.",
      },
      en: {
        name: "Nutri Natus Amargo — Functional Tea",
        tagline: "Chamomile, carqueja, green tea and mint, ready to drink",
        size: "500 ml · ready to drink",
        description:
          "A ready-to-drink tea with chamomile, carqueja, green tea and mint. A light, practical choice for moments of lightness, digestion and mindful eating.",
        highlights: [
          "Chamomile, carqueja, green tea and mint",
          "Ready to drink",
          "A feeling of lightness and wellbeing",
          "Gluten free",
          "500 ml",
        ],
        composition: ["Chamomile", "Carqueja", "Green tea", "Mint"],
        usage: "Ready to drink. Shake before drinking.",
        indication: "General use. Keep in a cool place.",
      },
    },
  },
  {
    id: 19,
    slug: "menta-fort",
    image: "/products/menta-fort.webp",
    category: "equilibrio",
    price: 34.9,
    rating: 4.6,
    reviews: 54,
    i18n: {
      pt: {
        name: "Menta Fort — Óleo Essencial de Menta",
        tagline: "Frescor, digestão e conforto respiratório",
        size: "Uso tradicional",
        description:
          "Óleo essencial de menta, tradicionalmente usado na naturopatia para promover frescor, apoiar a digestão e trazer conforto respiratório. Versátil para o dia a dia.",
        highlights: [
          "Óleo essencial de menta (Mentha arvensis)",
          "Sensação de frescor",
          "Apoio à digestão",
          "Conforto respiratório",
          "Uso tradicional versátil",
        ],
        composition: ["Óleo essencial de menta (Mentha arvensis L.)"],
        usage: "Uso conforme a orientação da embalagem.",
        indication: "Quem busca frescor, digestão e bem-estar respiratório.",
      },
      en: {
        name: "Menta Fort — Peppermint Essential Oil",
        tagline: "Freshness, digestion and respiratory comfort",
        size: "Traditional use",
        description:
          "Peppermint essential oil, traditionally used in naturopathy to promote freshness, support digestion and bring respiratory comfort. Versatile for everyday use.",
        highlights: [
          "Peppermint essential oil (Mentha arvensis)",
          "Feeling of freshness",
          "Supports digestion",
          "Respiratory comfort",
          "Versatile traditional use",
        ],
        composition: ["Peppermint essential oil (Mentha arvensis L.)"],
        usage: "Use as directed on the label.",
        indication:
          "For those seeking freshness, digestion and respiratory wellbeing.",
      },
    },
  },
];

// ── Selectors ──────────────────────────────────────────────────────────────
export function tp(p: Product, lang: Lang): ProductText {
  return p.i18n[lang] ?? p.i18n.pt;
}

export function categoryName(id: CategoryId, lang: Lang): string {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.name[lang] ?? c.name.pt : id;
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export const HERO_PRODUCTS = PRODUCTS.filter((p) => p.hero).sort(
  (a, b) => (a.hero!.order ?? 0) - (b.hero!.order ?? 0)
);

export const FEATURED_PRODUCTS = PRODUCTS.filter((p) => p.featured);

export const FREE_SHIPPING_THRESHOLD = 199;
export const WHATSAPP_NUMBER = "5511999999999"; // placeholder — substituir pelo número real
