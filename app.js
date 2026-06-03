// save as fetch-exercises.js

const fs = require("fs");

// если Node < 18 раскомментируй:
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const urls = [
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-positive-easy.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-positive-easy.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-positive-intermediate.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-positive-advanced.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-contractions-basic.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-contractions-advanced.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-negative-basic.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-negative-advanced.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-questions.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-short-answers.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-past-positive.json",
    "https://www.english-exercises.org/content/exercises/grammar/verb-to-be/verb-to-be-past-negative-questions.json"
]

const DELAY = 1500; // 1.5 сек
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url);

    if (res.status === 429) {
      console.warn(`⚠️ 429 Too Many Requests: ${url}`);
      await sleep(DELAY * 2);
      return fetchWithRetry(url, attempt);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();

  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`🔁 Retry ${attempt} → ${url}`);
      await sleep(DELAY * attempt);
      return fetchWithRetry(url, attempt + 1);
    }

    console.error(`❌ Failed: ${url}`);
    return null;
  }
}

async function run() {
  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    console.log(`⏳ [${i + 1}/${urls.length}] Fetching: ${url}`);

    const data = await fetchWithRetry(url);

    if (data) {
      results.push({
        data: data,
        url: url    
      });
    }

    // 👉 рандомная задержка (анти-бан)
    const randomDelay = DELAY + Math.random() * 1000;
    await sleep(randomDelay);
  }

  // 👉 сохраняем файл
  fs.writeFileSync(
    "exercises.json",
    JSON.stringify(results, null, 2),
    "utf-8"
  );

  console.log("🎉 Готово! Файл exercises.json создан");
}

run();