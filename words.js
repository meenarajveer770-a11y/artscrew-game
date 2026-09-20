/**
 * ARTSCREW - Curated Drawable Word Bank
 * Structured strictly by progressive difficulty levels so early rounds are super basic,
 * and later rounds gradually introduce exciting creative challenges.
 * Every word includes a helpful Category Clue!
 */

const wordTiers = {
  // Round 1: Super Basic (Easy to draw in 10-20 seconds, universally recognizable)
  tier1_basic: [
    { word: "sun", category: "Nature" },
    { word: "cat", category: "Animal" },
    { word: "dog", category: "Animal" },
    { word: "tree", category: "Nature" },
    { word: "car", category: "Vehicle" },
    { word: "fish", category: "Animal" },
    { word: "book", category: "Object" },
    { word: "cup", category: "Object" },
    { word: "hat", category: "Clothing" },
    { word: "ball", category: "Sports" },
    { word: "bed", category: "Furniture" },
    { word: "eye", category: "Body" },
    { word: "door", category: "Home" },
    { word: "star", category: "Space" },
    { word: "moon", category: "Space" },
    { word: "bird", category: "Animal" },
    { word: "house", category: "Building" },
    { word: "cake", category: "Food" },
    { word: "apple", category: "Food" },
    { word: "boat", category: "Vehicle" },
    { word: "clock", category: "Object" },
    { word: "key", category: "Object" },
    { word: "ring", category: "Accessory" },
    { word: "shoe", category: "Clothing" },
    { word: "duck", category: "Animal" },
    { word: "hand", category: "Body" },
    { word: "milk", category: "Drink" },
    { word: "nose", category: "Body" },
    { word: "rain", category: "Weather" },
    { word: "egg", category: "Food" },
    { word: "fire", category: "Nature" },
    { word: "box", category: "Object" },
    { word: "bus", category: "Vehicle" },
    { word: "pig", category: "Animal" },
    { word: "chair", category: "Furniture" },
    { word: "spoon", category: "Kitchen" },
    { word: "sock", category: "Clothing" },
    { word: "pen", category: "Stationery" },
    { word: "pizza", category: "Food" },
    { word: "bread", category: "Food" },
    { word: "banana", category: "Food" },
    { word: "frog", category: "Animal" },
    { word: "bear", category: "Animal" },
    { word: "cow", category: "Animal" },
    { word: "cloud", category: "Weather" },
    { word: "snow", category: "Weather" },
    { word: "bone", category: "Object" },
    { word: "flag", category: "Object" },
    { word: "lamp", category: "Home" },
    { word: "leaf", category: "Nature" },
    { word: "fork", category: "Kitchen" },
    { word: "bell", category: "Object" },
    { word: "ice", category: "Nature" },
    { word: "kite", category: "Toy" },
    { word: "smile", category: "Emotion" },
    { word: "heart", category: "Symbol" },
    { word: "baby", category: "People" },
    { word: "king", category: "Role" }
  ],

  // Round 2: Familiar Everyday Objects, Animals & Foods
  tier2_familiar: [
    { word: "guitar", category: "Music" },
    { word: "burger", category: "Food" },
    { word: "candle", category: "Object" },
    { word: "camera", category: "Tech" },
    { word: "ladder", category: "Tool" },
    { word: "rocket", category: "Space" },
    { word: "robot", category: "Sci-Fi" },
    { word: "flower", category: "Nature" },
    { word: "castle", category: "Building" },
    { word: "spider", category: "Insect" },
    { word: "turtle", category: "Animal" },
    { word: "monkey", category: "Animal" },
    { word: "bridge", category: "Place" },
    { word: "train", category: "Vehicle" },
    { word: "glasses", category: "Accessory" },
    { word: "shark", category: "Animal" },
    { word: "dolphin", category: "Animal" },
    { word: "rainbow", category: "Weather" },
    { word: "hammer", category: "Tool" },
    { word: "scissors", category: "Tool" },
    { word: "umbrella", category: "Object" },
    { word: "crown", category: "Accessory" },
    { word: "lion", category: "Animal" },
    { word: "panda", category: "Animal" },
    { word: "airplane", category: "Vehicle" },
    { word: "cookie", category: "Food" },
    { word: "donut", category: "Food" },
    { word: "pencil", category: "Stationery" },
    { word: "ice cream", category: "Dessert" },
    { word: "sandwich", category: "Food" },
    { word: "popcorn", category: "Snack" },
    { word: "elephant", category: "Animal" },
    { word: "giraffe", category: "Animal" },
    { word: "penguin", category: "Animal" },
    { word: "balloon", category: "Party" },
    { word: "bicycle", category: "Vehicle" },
    { word: "campfire", category: "Outdoor" },
    { word: "diamond", category: "Jewelry" },
    { word: "feather", category: "Animal" },
    { word: "ghost", category: "Fantasy" },
    { word: "helmet", category: "Safety" },
    { word: "island", category: "Geography" },
    { word: "jacket", category: "Clothing" },
    { word: "magnet", category: "Science" },
    { word: "mirror", category: "Home" },
    { word: "necklace", category: "Jewelry" },
    { word: "octopus", category: "Sea Creature" },
    { word: "piano", category: "Music" },
    { word: "puzzle", category: "Game" },
    { word: "snail", category: "Animal" },
    { word: "sword", category: "Weapon" },
    { word: "tent", category: "Outdoor" },
    { word: "tiger", category: "Animal" },
    { word: "volcano", category: "Nature" },
    { word: "wallet", category: "Accessory" },
    { word: "whistle", category: "Object" },
    { word: "zebra", category: "Animal" }
  ],

  // Round 3: Creative, Fun & Pop Culture
  tier3_intermediate: [
    { word: "helicopter", category: "Vehicle" },
    { word: "dinosaur", category: "Animal" },
    { word: "kangaroo", category: "Animal" },
    { word: "skateboard", category: "Sports" },
    { word: "superhero", category: "Character" },
    { word: "detective", category: "Job" },
    { word: "astronaut", category: "Job" },
    { word: "snowman", category: "Winter" },
    { word: "lighthouse", category: "Building" },
    { word: "treasure", category: "Adventure" },
    { word: "fireworks", category: "Celebration" },
    { word: "magic wand", category: "Fantasy" },
    { word: "basketball", category: "Sports" },
    { word: "rollercoaster", category: "Theme Park" },
    { word: "submarine", category: "Vehicle" },
    { word: "backpack", category: "School" },
    { word: "microphone", category: "Music" },
    { word: "sunglasses", category: "Fashion" },
    { word: "flamingo", category: "Bird" },
    { word: "waterfall", category: "Nature" },
    { word: "pirate ship", category: "Adventure" },
    { word: "vampire", category: "Monster" },
    { word: "zombie", category: "Monster" },
    { word: "alien", category: "Sci-Fi" },
    { word: "superman", category: "Hero" },
    { word: "batman", category: "Hero" },
    { word: "spiderman", category: "Hero" },
    { word: "pikachu", category: "Gaming" },
    { word: "mario", category: "Gaming" },
    { word: "sonic", category: "Gaming" },
    { word: "minecraft", category: "Gaming" },
    { word: "headphones", category: "Tech" },
    { word: "laptop", category: "Tech" },
    { word: "smartphone", category: "Tech" },
    { word: "telescope", category: "Space" },
    { word: "microscope", category: "Science" },
    { word: "parachute", category: "Sky" },
    { word: "boomerang", category: "Toy" },
    { word: "chameleon", category: "Reptile" },
    { word: "compass", category: "Navigation" },
    { word: "dragon", category: "Mythology" },
    { word: "earthquake", category: "Disaster" },
    { word: "flashlight", category: "Tool" },
    { word: "graffiti", category: "Art" },
    { word: "hamburger", category: "Food" },
    { word: "igloo", category: "Architecture" },
    { word: "jellyfish", category: "Ocean" },
    { word: "koala", category: "Animal" },
    { word: "labyrinth", category: "Puzzle" },
    { word: "meteor", category: "Space" },
    { word: "ninja", category: "Warrior" },
    { word: "origami", category: "Craft" },
    { word: "potion", category: "Magic" },
    { word: "quicksand", category: "Hazard" },
    { word: "scarecrow", category: "Farm" },
    { word: "tornado", category: "Weather" },
    { word: "unicorn", category: "Mythology" },
    { word: "windmill", category: "Energy" }
  ],

  // Round 4+: Pro & Creative Masters
  tier4_creative: [
    { word: "time machine", category: "Sci-Fi" },
    { word: "haunted house", category: "Horror" },
    { word: "solar system", category: "Space" },
    { word: "ferris wheel", category: "Carnival" },
    { word: "archaeologist", category: "Science" },
    { word: "statue of liberty", category: "Landmark" },
    { word: "eiffel tower", category: "Landmark" },
    { word: "space station", category: "Space" },
    { word: "constellation", category: "Astronomy" },
    { word: "deep sea diving", category: "Activity" },
    { word: "black hole", category: "Cosmos" },
    { word: "kaleidoscope", category: "Visual" },
    { word: "photosynthesis", category: "Biology" },
    { word: "flying carpet", category: "Fairy Tale" },
    { word: "golden gate bridge", category: "Landmark" },
    { word: "traffic light", category: "City" },
    { word: "wind turbine", category: "Green Energy" },
    { word: "fire extinguisher", category: "Safety" },
    { word: "hovercraft", category: "Future Tech" },
    { word: "snowmobile", category: "Winter" },
    { word: "record player", category: "Vintage" },
    { word: "slot machine", category: "Casino" },
    { word: "suspension bridge", category: "Engineering" },
    { word: "waterpark", category: "Attraction" },
    { word: "gingerbread house", category: "Holiday" },
    { word: "cheesecake", category: "Bakery" },
    { word: "alien abduction", category: "Sci-Fi" },
    { word: "bermuda triangle", category: "Mystery" }
  ]
};

class WordManager {
  constructor() {
    this.tiers = wordTiers;
    // Flat lookup map for quick category resolution
    this.categoryMap = new Map();
    for (const tierKey of Object.keys(this.tiers)) {
      for (const item of this.tiers[tierKey]) {
        this.categoryMap.set(item.word.toLowerCase(), item.category);
      }
    }
    console.log(`[WordManager] Loaded curated progressive tiers!`);
  }

  getWordChoices(difficulty = 'dynamic', round = 1, usedSet = new Set(), customWords = []) {
    let pool = [];
    let effectiveDifficulty = difficulty;

    if (difficulty === 'dynamic') {
      if (round === 1) {
        effectiveDifficulty = 'easy';
        pool = this.tiers.tier1_basic;
      } else if (round === 2) {
        effectiveDifficulty = 'medium';
        pool = this.tiers.tier2_familiar;
      } else if (round === 3) {
        effectiveDifficulty = 'hard';
        pool = this.tiers.tier3_intermediate;
      } else {
        effectiveDifficulty = 'extreme';
        pool = this.tiers.tier4_creative;
      }
    } else if (difficulty === 'easy') {
      pool = this.tiers.tier1_basic;
    } else if (difficulty === 'medium') {
      pool = this.tiers.tier2_familiar;
    } else if (difficulty === 'hard') {
      pool = this.tiers.tier3_intermediate;
    } else {
      pool = this.tiers.tier4_creative;
    }

    // Merge custom words if provided
    let candidateList = [...pool];
    if (customWords && customWords.length > 0) {
      const customObjects = customWords.map(w => ({ word: w.toLowerCase(), category: "Custom" }));
      candidateList = [...customObjects, ...candidateList];
    }

    // Filter out recently used words
    const available = candidateList.filter(item => !usedSet.has(item.word.toLowerCase()));
    const finalPool = available.length >= 3 ? available : candidateList;

    // Pick 3 unique words
    const choices = [];
    const poolCopy = [...finalPool];

    while (choices.length < 3 && poolCopy.length > 0) {
      const randIdx = Math.floor(Math.random() * poolCopy.length);
      const chosenItem = poolCopy.splice(randIdx, 1)[0];
      if (!choices.some(c => c.word === chosenItem.word)) {
        choices.push(chosenItem);
      }
    }

    // Fallback if pool was small
    if (choices.length < 3) {
      const fallbacks = this.tiers.tier1_basic;
      for (const fb of fallbacks) {
        if (!choices.some(c => c.word === fb.word)) {
          choices.push(fb);
          if (choices.length === 3) break;
        }
      }
    }

    return {
      choices: choices.map(c => c.word),
      categories: choices.map(c => c.category),
      difficulty: effectiveDifficulty
    };
  }

  getCategoryForWord(word) {
    return this.categoryMap.get(word.toLowerCase()) || "General";
  }

  getTimerForDifficulty(difficulty, customDrawTime = 75) {
    if (difficulty === 'easy') return 80;
    if (difficulty === 'medium') return 65;
    if (difficulty === 'hard') return 50;
    if (difficulty === 'extreme') return 35;
    return customDrawTime || 70;
  }
}

module.exports = new WordManager();
