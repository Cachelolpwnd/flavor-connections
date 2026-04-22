import * as fs from "fs";
import * as readline from "readline";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_PATH = "attached_assets/povarenok_recipes_2021_06_16.csv";
const BATCH_SIZE = 500;
const COOCCURRENCE_FLUSH_EVERY = 5000;

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (/суп|борщ|щи|солянка|уха|рассольник|окрошка|похлёбка|похлебка|бульон/.test(n)) return "Супы";
  if (/салат/.test(n)) return "Салаты";
  if (/торт|кекс|пирог|печенье|пончик|вафл|круассан|чизкейк|эклер|маффин|brownie|брауни|корж/.test(n)) return "Выпечка и десерты";
  if (/блин|оладь|панкейк/.test(n)) return "Блины и оладьи";
  if (/варен|джем|конфитюр|повидло|мармелад/.test(n)) return "Заготовки";
  if (/коктейль|смузи|сок|компот|кисель|морс|лимонад|напиток|настойка|наливка|ликёр|вино|пиво/.test(n)) return "Напитки";
  if (/каша|омлет|яичниц|завтрак|мюсли|гранол/.test(n)) return "Завтраки";
  if (/паста|спагетти|макарон|лапш|фетучини|пенне|ризотто/.test(n)) return "Паста и крупы";
  if (/пицца/.test(n)) return "Пицца";
  if (/шашлык|гриль|барбекю|стейк/.test(n)) return "Гриль";
  if (/курин|куриц|котлет|фарш|свинин|говядин|баранин|мясо|бефстроган|гуляш|отбивн/.test(n)) return "Мясные блюда";
  if (/рыб|сёмга|семга|лосос|треска|тунец|сельдь|карп|судак|форел|морепродукт|кревет|мидии|кальмар|осьминог/.test(n)) return "Рыба и морепродукты";
  if (/сэндвич|бутерброд|тост/.test(n)) return "Сэндвичи";
  if (/соус|маринад|заправк/.test(n)) return "Соусы";
  if (/варенье|соленье|маринованн|квашен/.test(n)) return "Заготовки";
  if (/суши|роллы|вок|рамен/.test(n)) return "Азиатская кухня";
  return "Основные блюда";
}

function parseIngredientNames(raw: string): string[] {
  const matches = raw.matchAll(/'([^']+)'(?:\s*:)/g);
  const names: string[] = [];
  for (const m of matches) {
    const name = m[1].trim();
    if (name && name.length > 1) names.push(name);
  }
  return names;
}

function parseLine(line: string): { url: string; name: string; ingredients: string } | null {
  const firstComma = line.indexOf(",");
  if (firstComma === -1) return null;
  const url = line.slice(0, firstComma).trim();

  const rest = line.slice(firstComma + 1);
  const secondComma = rest.indexOf(",");
  if (secondComma === -1) return null;

  let name = rest.slice(0, secondComma).trim();
  let ingredients = rest.slice(secondComma + 1).trim();

  if (name.startsWith('"') && !name.endsWith('"')) {
    const endIdx = rest.indexOf('",');
    if (endIdx !== -1) {
      name = rest.slice(0, endIdx + 1).trim();
      ingredients = rest.slice(endIdx + 2).trim();
    }
  }

  name = name.replace(/^"|"$/g, "");
  if (ingredients.startsWith('"')) {
    ingredients = ingredients.slice(1);
  }
  if (ingredients.endsWith('"')) {
    ingredients = ingredients.slice(0, -1);
  }

  if (!url.startsWith("http")) return null;

  return { url, name, ingredients };
}

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      url text UNIQUE,
      name text NOT NULL,
      category text,
      ingredients_raw text NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredient_cooccurrence (
      ingredient_a text NOT NULL,
      ingredient_b text NOT NULL,
      count integer NOT NULL DEFAULT 0,
      PRIMARY KEY (ingredient_a, ingredient_b)
    )
  `);
  await pool.query(`DELETE FROM recipes`);
  await pool.query(`DELETE FROM ingredient_cooccurrence`);

  console.log("Tables ready. Starting import...");

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let recipeBatch: Array<{ url: string; name: string; category: string; ingredientsRaw: string }> = [];
  const cooccurrenceMap = new Map<string, number>();
  let totalImported = 0;
  let totalProcessed = 0;

  async function flushRecipes() {
    if (recipeBatch.length === 0) return;
    const vals = recipeBatch.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ");
    const params = recipeBatch.flatMap((r) => [r.url, r.name, r.category, r.ingredientsRaw]);
    await pool.query(
      `INSERT INTO recipes (url, name, category, ingredients_raw) VALUES ${vals} ON CONFLICT (url) DO NOTHING`,
      params
    );
    totalImported += recipeBatch.length;
    recipeBatch = [];
  }

  async function flushCooccurrence() {
    if (cooccurrenceMap.size === 0) return;
    const entries = [...cooccurrenceMap.entries()];
    const CHUNK = 200;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const vals = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(", ");
      const params = chunk.flatMap(([key, count]) => {
        const [a, b] = key.split("|||");
        return [a, b, count];
      });
      await pool.query(
        `INSERT INTO ingredient_cooccurrence (ingredient_a, ingredient_b, count) VALUES ${vals}
         ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET count = ingredient_cooccurrence.count + EXCLUDED.count`,
        params
      );
    }
    cooccurrenceMap.clear();
    console.log(`  Flushed cooccurrence. Total recipes imported: ${totalImported}`);
  }

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    const category = detectCategory(parsed.name);
    recipeBatch.push({
      url: parsed.url,
      name: parsed.name,
      category,
      ingredientsRaw: parsed.ingredients,
    });

    const ingNames = parseIngredientNames(parsed.ingredients);
    for (let i = 0; i < ingNames.length; i++) {
      for (let j = i + 1; j < ingNames.length; j++) {
        const a = ingNames[i] < ingNames[j] ? ingNames[i] : ingNames[j];
        const b = ingNames[i] < ingNames[j] ? ingNames[j] : ingNames[i];
        const key = `${a}|||${b}`;
        cooccurrenceMap.set(key, (cooccurrenceMap.get(key) ?? 0) + 1);
      }
    }

    totalProcessed++;

    if (recipeBatch.length >= BATCH_SIZE) {
      await flushRecipes();
    }

    if (totalProcessed % COOCCURRENCE_FLUSH_EVERY === 0) {
      await flushRecipes();
      await flushCooccurrence();
      console.log(`Processed ${totalProcessed} recipes...`);
    }
  }

  await flushRecipes();
  await flushCooccurrence();

  const { rows } = await pool.query("SELECT COUNT(*) FROM recipes");
  const { rows: coRows } = await pool.query("SELECT COUNT(*) FROM ingredient_cooccurrence");
  console.log(`\nДОНЕ! Импортировано рецептов: ${rows[0].count}`);
  console.log(`Уникальных пар ингредиентов: ${coRows[0].count}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
