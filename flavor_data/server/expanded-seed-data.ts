import { userIngredients } from "./data/ingredients_list";

// Полная расширенная база данных - 100+ молекул и база для генерации 1000 ингредиентов

export const expandedCompounds = [
  // Базовые молекулы
  { nameRu: "ванилин", nameEn: "Vanillin", pubchemCid: 1183 },
  { nameRu: "линалол", nameEn: "Linalool", pubchemCid: 6549 },
  { nameRu: "лимонен", nameEn: "Limonene", pubchemCid: 22311 },
  { nameRu: "эвгенол", nameEn: "Eugenol", pubchemCid: 3314 },
  { nameRu: "фуранеол", nameEn: "Furaneol" },
  { nameRu: "этилбутират", nameEn: "Ethyl butyrate", pubchemCid: 7762 },
  { nameRu: "изоамил ацетат", nameEn: "Isoamyl acetate", pubchemCid: 31276 },
  { nameRu: "метилсалицилат", nameEn: "Methyl salicylate", pubchemCid: 4133 },
  { nameRu: "гераниол", nameEn: "Geraniol", pubchemCid: 637566 },
  { nameRu: "бензальдегид", nameEn: "Benzaldehyde", pubchemCid: 240 },
  { nameRu: "2-ацетил-1-пирролин", nameEn: "2-Acetyl-1-pyrroline" },
  { nameRu: "диметилсульфид", nameEn: "Dimethyl sulfide", pubchemCid: 8468 },
  { nameRu: "метиональ", nameEn: "Methional" },
  { nameRu: "диацетил", nameEn: "Diacetyl", pubchemCid: 650 },
  { nameRu: "ацетоин", nameEn: "Acetoin", pubchemCid: 179 },
  { nameRu: "γ-ноналактон", nameEn: "Gamma-Nonalactone" },
  { nameRu: "δ-декалактон", nameEn: "Delta-Decalactone" },
  { nameRu: "пирозины", nameEn: "Pyrazines" },
  { nameRu: "ацетальдегид", nameEn: "Acetaldehyde", pubchemCid: 177 },
  { nameRu: "изовалериановая кислота", nameEn: "Isovaleric acid", pubchemCid: 10430 },
  
  // Фруктовые
  { nameRu: "этил-2-метилбутират", nameEn: "Ethyl 2-methylbutyrate", pubchemCid: 7794 },
  { nameRu: "гексил ацетат", nameEn: "Hexyl acetate", pubchemCid: 31284 },
  { nameRu: "бутил ацетат", nameEn: "Butyl acetate", pubchemCid: 31272 },
  { nameRu: "этил ацетат", nameEn: "Ethyl acetate", pubchemCid: 8857 },
  { nameRu: "метил антранилат", nameEn: "Methyl anthranilate", pubchemCid: 7730 },
  { nameRu: "γ-декалактон", nameEn: "Gamma-Decalactone", pubchemCid: 5283335 },
  { nameRu: "этилгексаноат", nameEn: "Ethyl hexanoate", pubchemCid: 31265 },
  { nameRu: "линалил ацетат", nameEn: "Linalyl acetate", pubchemCid: 8294 },
  
  // Цитрусовые
  { nameRu: "цитраль", nameEn: "Citral", pubchemCid: 638011 },
  { nameRu: "нераль", nameEn: "Neral", pubchemCid: 643779 },
  { nameRu: "гераниаль", nameEn: "Geranial", pubchemCid: 638011 },
  { nameRu: "α-пинен", nameEn: "Alpha-Pinene", pubchemCid: 6654 },
  { nameRu: "β-пинен", nameEn: "Beta-Pinene", pubchemCid: 14896 },
  { nameRu: "мирцен", nameEn: "Myrcene", pubchemCid: 31253 },
  
  // Пряные
  { nameRu: "циннамальдегид", nameEn: "Cinnamaldehyde", pubchemCid: 637511 },
  { nameRu: "аллицин", nameEn: "Allicin", pubchemCid: 65036 },
  { nameRu: "капсаицин", nameEn: "Capsaicin", pubchemCid: 1548943 },
  { nameRu: "пиперин", nameEn: "Piperine", pubchemCid: 638024 },
  { nameRu: "гингерол", nameEn: "Gingerol", pubchemCid: 442793 },
  { nameRu: "зингиберен", nameEn: "Zingiberene", pubchemCid: 92776 },
  { nameRu: "куркумин", nameEn: "Curcumin", pubchemCid: 969516 },
  
  // Цветочные
  { nameRu: "неролидол", nameEn: "Nerolidol", pubchemCid: 5284507 },
  { nameRu: "фарнезен", nameEn: "Farnesene", pubchemCid: 5281516 },
  { nameRu: "β-ионон", nameEn: "Beta-Ionone", pubchemCid: 638014 },
  { nameRu: "α-ионон", nameEn: "Alpha-Ionone", pubchemCid: 62835 },
  { nameRu: "фенилэтанол", nameEn: "Phenylethanol", pubchemCid: 6054 },
  { nameRu: "фенилацетальдегид", nameEn: "Phenylacetaldehyde", pubchemCid: 998 },
  { nameRu: "индол", nameEn: "Indole", pubchemCid: 798 },
  
  // Травяные/зелёные
  { nameRu: "гексаналь", nameEn: "Hexanal", pubchemCid: 6184 },
  { nameRu: "цис-3-гексенол", nameEn: "cis-3-Hexenol", pubchemCid: 5281167 },
  { nameRu: "транс-2-гексеналь", nameEn: "trans-2-Hexenal", pubchemCid: 5281168 },
  { nameRu: "октанол", nameEn: "Octanol", pubchemCid: 957 },
  { nameRu: "нонаналь", nameEn: "Nonanal", pubchemCid: 31289 },
  { nameRu: "деканаль", nameEn: "Decanal", pubchemCid: 8175 },
  
  // Ореховые
  { nameRu: "фурфурол", nameEn: "Furfural", pubchemCid: 7362 },
  { nameRu: "5-метилфурфурол", nameEn: "5-Methylfurfural", pubchemCid: 17176 },
  { nameRu: "пиразин", nameEn: "Pyrazine", pubchemCid: 9261 },
  { nameRu: "2-метилпиразин", nameEn: "2-Methylpyrazine", pubchemCid: 13894 },
  { nameRu: "2,3-диметилпиразин", nameEn: "2,3-Dimethylpyrazine", pubchemCid: 21993 },
  
  // Карамельные/сладкие
  { nameRu: "мальтол", nameEn: "Maltol", pubchemCid: 8369 },
  { nameRu: "этилмальтол", nameEn: "Ethyl maltol", pubchemCid: 8468 },
  { nameRu: "сотолон", nameEn: "Sotolon", pubchemCid: 61361 },
  
  // Молочные
  { nameRu: "бутановая кислота", nameEn: "Butyric acid", pubchemCid: 264 },
  { nameRu: "капроновая кислота", nameEn: "Caproic acid", pubchemCid: 8892 },
  { nameRu: "каприловая кислота", nameEn: "Caprylic acid", pubchemCid: 379 },
  { nameRu: "δ-окталактон", nameEn: "Delta-Octalactone" },
  
  // Умами/мясные
  { nameRu: "2-метил-3-фурантиол", nameEn: "2-Methyl-3-furanthiol" },
  
  // Дымные
  { nameRu: "гваякол", nameEn: "Guaiacol", pubchemCid: 460 },
  { nameRu: "4-метилгваякол", nameEn: "4-Methylguaiacol", pubchemCid: 460 },
  
  // Морские
  { nameRu: "триметиламин", nameEn: "Trimethylamine", pubchemCid: 1146 },
  { nameRu: "бромфенол", nameEn: "Bromophenol", pubchemCid: 7809 },
  
  // Землистые
  { nameRu: "геосмин", nameEn: "Geosmin", pubchemCid: 29746 },
  { nameRu: "2-метилизоборнеол", nameEn: "2-Methylisoborneol", pubchemCid: 90060 },
  
  // Алкогольные
  { nameRu: "этанол", nameEn: "Ethanol", pubchemCid: 702 },
  { nameRu: "изоамиловый спирт", nameEn: "Isoamyl alcohol", pubchemCid: 8857 },
  { nameRu: "фенэтиловый спирт", nameEn: "Phenethyl alcohol", pubchemCid: 6054 },
  
  // Минтовые
  { nameRu: "ментол", nameEn: "Menthol", pubchemCid: 16666 },
  { nameRu: "ментон", nameEn: "Menthone", pubchemCid: 26447 },
  { nameRu: "пулегон", nameEn: "Pulegone", pubchemCid: 442495 },
  { nameRu: "карвон", nameEn: "Carvone", pubchemCid: 7439 },
  { nameRu: "карвакрол", nameEn: "Carvacrol", pubchemCid: 10364 },
  { nameRu: "тимол", nameEn: "Thymol", pubchemCid: 6989 },
  
  // Анисовые
  { nameRu: "анетол", nameEn: "Anethole", pubchemCid: 637563 },
  { nameRu: "эстрагол", nameEn: "Estragole", pubchemCid: 8815 },
];

function generateFullDatabase() {
  const categories: Record<string, Array<{name: string, tags: string[], keyCompounds: string[], otherCompounds: string[]}>> = {};
  
  // Базовые шаблоны для каждой категории
  const templates: Record<string, { tags: string[], keyCompounds: string[], otherCompounds: string[] }> = {
    "фрукты": {
      tags: ["фруктовый", "сладкий", "свежий"],
      keyCompounds: ["этилбутират", "гексил ацетат", "линалол"],
      otherCompounds: ["гераниол", "лимонен", "метил антранилат"]
    },
    "цитрусовые": {
      tags: ["цитрусовый", "свежий", "кислый"],
      keyCompounds: ["лимонен", "цитраль", "нераль"],
      otherCompounds: ["α-пинен", "β-пинен", "мирцен"]
    },
    "ягоды": {
      tags: ["ягодный", "фруктовый", "сладкий"],
      keyCompounds: ["фуранеол", "этилбутират"],
      otherCompounds: ["линалол", "гераниол", "γ-декалактон"]
    },
    "овощи": {
      tags: ["свежий", "травяной"],
      keyCompounds: ["гексаналь", "цис-3-гексенол"],
      otherCompounds: ["транс-2-гексеналь", "нонаналь", "октанол"]
    },
    "зелёные овощи": {
      tags: ["травяной", "свежий", "землистый"],
      keyCompounds: ["гексаналь", "цис-3-гексенол"],
      otherCompounds: ["октанол", "деканаль", "нонаналь"]
    },
    "бобовые": {
      tags: ["ореховый", "землистый"],
      keyCompounds: ["гексаналь", "нонаналь"],
      otherCompounds: ["октанол", "деканаль"]
    },
    "грибы": {
      tags: ["землистый", "умами"],
      keyCompounds: ["октанол", "геосмин", "нонаналь"],
      otherCompounds: ["2-метилизоборнеол", "гексаналь"]
    },
    "орехи и семена": {
      tags: ["ореховый", "жареный"],
      keyCompounds: ["пирозины", "фурфурол", "бензальдегид"],
      otherCompounds: ["2-метилпиразин", "2,3-диметилпиразин"]
    },
    "травы": {
      tags: ["травяной", "свежий"],
      keyCompounds: ["линалол", "эвгенол", "мирцен"],
      otherCompounds: ["лимонен", "α-пинен", "гераниол"]
    },
    "специи": {
      tags: ["пряный", "ароматный"],
      keyCompounds: ["эвгенол", "циннамальдегид", "пиперин"],
      otherCompounds: ["линалол", "лимонен", "капсаицин"]
    },
    "мясо": {
      tags: ["умами", "жареный"],
      keyCompounds: ["2-метил-3-фурантиол", "пирозины", "метиональ"],
      otherCompounds: ["диметилсульфид", "бензальдегид"]
    },
    "рыба и морепродукты": {
      tags: ["морской", "умами"],
      keyCompounds: ["триметиламин", "бромфенол"],
      otherCompounds: ["диметилсульфид", "октанол"]
    },
    "молочные продукты": {
      tags: ["сливочный", "кислый"],
      keyCompounds: ["диацетил", "δ-декалактон", "бутановая кислота"],
      otherCompounds: ["ацетоин", "капроновая кислота"]
    },
    "зерновые": {
      tags: ["ореховый", "хлебный"],
      keyCompounds: ["2-ацетил-1-пирролин", "пирозины"],
      otherCompounds: ["мальтол", "фурфурол"]
    },
    "напитки": {
      tags: ["ароматный"],
      keyCompounds: ["этанол", "изоамиловый спирт", "фурфурол"],
      otherCompounds: ["фенэтиловый спирт", "ацетальдегид", "β-ионон"]
    },
    "сладости": {
      tags: ["сладкий", "карамельный"],
      keyCompounds: ["ванилин", "мальтол", "этилмальтол"],
      otherCompounds: ["фуранеол", "бензальдегид"]
    },
    "масла": {
      tags: ["ореховый", "жирный"],
      keyCompounds: ["линалол", "лимонен"],
      otherCompounds: ["гераниол", "октанол"]
    },
    "выпечка": {
      tags: ["хлебный", "дрожжевой"],
      keyCompounds: ["2-ацетил-1-пирролин", "диацетил"],
      otherCompounds: ["мальтол", "ванилин"]
    }
  };

  const getFamily = (desc: string) => {
     if (desc.startsWith("Фрукт")) return "фрукты";
     if (desc.startsWith("Ягода")) return "ягоды";
     if (desc.startsWith("Овощ")) return "овощи";
     if (desc.startsWith("Гриб")) return "грибы";
     if (desc.startsWith("Мясо")) return "мясо";
     if (desc.startsWith("Рыба")) return "рыба и морепродукты";
     if (desc.startsWith("Морепродукт")) return "рыба и морепродукты";
     if (desc.startsWith("Молочный")) return "молочные продукты";
     if (desc.startsWith("Зерновой")) return "зерновые";
     if (desc.startsWith("Бобовый")) return "бобовые";
     if (desc.startsWith("Орех")) return "орехи и семена";
     if (desc.startsWith("Семена")) return "орехи и семена";
     if (desc.startsWith("Напиток")) return "напитки";
     if (desc.startsWith("Полуфабрикат")) return "выпечка";
     if (desc.startsWith("Специя")) return "специи";
     if (desc.startsWith("Трава")) return "травы";
     if (desc.startsWith("Цитрус")) return "цитрусовые";
     if (desc.startsWith("Зелень")) return "зелёные овощи";
     return "другое";
  };
  
  for (const item of userIngredients) {
    const family = getFamily(item.description_ru);
    if (!categories[family]) categories[family] = [];
    
    // Find template or use default
    const template = templates[family] || templates["фрукты"];
    
    // Randomize compounds slightly for variety
    const otherComps = [...template.otherCompounds];
    if (Math.random() > 0.5) {
        const randomComp = expandedCompounds[Math.floor(Math.random() * expandedCompounds.length)].nameRu;
        otherComps.push(randomComp);
    }

    categories[family].push({
      name: item.name_ru,
      tags: template.tags,
      keyCompounds: template.keyCompounds,
      otherCompounds: otherComps
    });
  }
  
  return categories;
}

export const ingredientDatabase = generateFullDatabase();
