import { readFile } from "fs/promises";

async function rand_deck() {
  try {
    const data = await readFile("./deck.json", "utf8");
    const cards = JSON.parse(data);

    // algoritmo gemini per mescolare

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    // console.log(cards);
    return cards;
  } catch (error) {
    console.error(error);
  }
}

export { rand_deck };
