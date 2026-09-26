/**
 * Initial content for the five learning games: 5 games × 3 levels × 6
 * challenges. GamesContentService copies it into the database once (missing
 * rows only — it never overwrites content edited later), after which the
 * database is the source of truth.
 *
 * Examples use contexts familiar to African learners: markets, farms,
 * football, buses, local geography. History items stick to well-established
 * facts and say "about" where dates are approximate.
 */

export type Kind = 'MULTIPLE_CHOICE' | 'CODE_PATH' | 'PHYSICS_LAUNCH';

export interface ChallengeContent {
  kind?: Kind;
  skill: string;
  prompt: string;
  speaker?: string;
  /** MULTIPLE_CHOICE: options[0] is correct in this file; they are shuffled on seed. */
  options?: string[];
  setup?: Record<string, unknown>;
  solution?: Record<string, unknown>;
  hints: string[];
  explanation: string;
}

export interface LevelContent {
  name: string;
  intro: string;
  learningObjective: string;
  difficulty: number;
  xpPerCorrect?: number;
  xpReward?: number;
  challenges: ChallengeContent[];
}

export interface GameContent {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  world: 'MATH_ISLAND' | 'READING_FOREST' | 'SCIENCE_PLANET' | 'CODING_CITY' | 'HISTORY_WORLD';
  subject: string;
  minGrade: number;
  maxGrade: number;
  badge: { slug: string; name: string; desc: string; glyph: string; gradient: string };
  order: number;
  levels: LevelContent[];
}

const mc = (skill: string, prompt: string, options: string[], hints: string[], explanation: string, speaker?: string): ChallengeContent =>
  ({ kind: 'MULTIPLE_CHOICE', skill, prompt, options, hints, explanation, speaker });

/** A grid puzzle: the robot starts at `start` facing `dir` and must end on `goal`, collecting `items`. */
const grid = (
  skill: string, prompt: string,
  g: { start: [number, number]; dir: 'N' | 'E' | 'S' | 'W'; goal: [number, number]; walls?: [number, number][]; items?: [number, number][]; maxBlocks: number },
  hints: string[], explanation: string,
): ChallengeContent => ({
  kind: 'CODE_PATH', skill, prompt, hints, explanation,
  setup: { size: 5, start: g.start, dir: g.dir, goal: g.goal, walls: g.walls ?? [], items: g.items ?? [], maxBlocks: g.maxBlocks },
  solution: { type: 'grid' },
});

/** Hit a target distance by choosing launch angle and power. */
const launch = (skill: string, prompt: string, gravity: number, target: [number, number], hints: string[], explanation: string): ChallengeContent => ({
  kind: 'PHYSICS_LAUNCH', skill, prompt, hints, explanation,
  setup: { gravity, target, power: [5, 25], angle: [10, 80] },
  solution: { type: 'range' },
});

export const GAME_CONTENT: GameContent[] = [
  // ---------------------------------------------------------------- MATH
  {
    slug: 'math-treasure-rush',
    name: 'Math Treasure Rush',
    tagline: 'Solve puzzles to open the gates of Math Island.',
    description: 'Cross bridges, open temple gates and fill your treasure meter by solving maths challenges.',
    world: 'MATH_ISLAND', subject: 'math', minGrade: 1, maxGrade: 6, order: 1,
    badge: { slug: 'math-explorer', name: 'Math Explorer', desc: 'Finished every level of Math Treasure Rush', glyph: '🏝️', gradient: 'from-sky-400 to-blue-600' },
    levels: [
      {
        name: 'Beach of Numbers', difficulty: 2,
        intro: 'Welcome to Math Island! Solve each puzzle to open the bridge ahead.',
        learningObjective: 'Add and subtract whole numbers in everyday situations.',
        challenges: [
          mc('math.addition', 'Abebe has 14 mangoes and buys 9 more at the market. How many mangoes does he have now?', ['23', '21', '25', '22'], ['Start at 14 and count on 9 more.', '14 + 6 = 20. Then add the 3 that are left.'], '14 + 9 = 23. Count on from 14: 15, 16 … 23.'),
          mc('math.subtraction', 'A bus leaves Adama with 52 passengers. 17 get off at Mojo. How many are still on the bus?', ['35', '39', '45', '33'], ['Take 17 away from 52.', '52 − 10 = 42, then take away 7 more.'], '52 − 17 = 35.'),
          mc('math.addition', 'Our team scored 3 goals in the first half and 4 in the second half. How many goals in total?', ['7', '6', '8', '12'], ['Add the two halves together.', '3 + 4 — count 4 more after 3.'], '3 + 4 = 7 goals.'),
          mc('math.subtraction', '86 − 29 = ?', ['57', '63', '55', '67'], ['29 is close to 30. Try 86 − 30 first.', '86 − 30 = 56. You took away 1 too many, so add it back.'], '86 − 30 = 56, and 56 + 1 = 57.'),
          mc('math.addition', 'A farmer plants 125 seedlings on Monday and 75 on Tuesday. How many seedlings in total?', ['200', '190', '210', '175'], ['Add the hundreds, tens and ones.', '125 + 75: 5 + 5 = 10, so carry 1 ten.'], '125 + 75 = 200.'),
          mc('math.subtraction', 'Sara has 40 birr. A notebook costs 18 birr. How much money does she have left?', ['22', '28', '12', '58'], ['Find 40 − 18.', '40 − 20 = 20, but you took away 2 too many.'], '40 − 18 = 22 birr.'),
        ],
      },
      {
        name: 'Multiplication Temple', difficulty: 3, xpPerCorrect: 12, xpReward: 60,
        intro: 'The temple doors open only for multiplication masters!',
        learningObjective: 'Multiply and divide within 100.',
        challenges: [
          mc('math.multiplication', '12 × 8 = ?', ['96', '84', '108', '88'], ['12 × 8 = 10 × 8 + 2 × 8.', '10 × 8 = 80 and 2 × 8 = 16.'], '80 + 16 = 96.'),
          mc('math.multiplication', 'There are 6 rows of coffee plants with 9 plants in each row. How many plants are there?', ['54', '45', '63', '56'], ['Rows × plants in each row.', '6 × 9 is the same as 9 + 9 + 9 + 9 + 9 + 9.'], '6 × 9 = 54 plants.'),
          mc('math.division', '72 ÷ 8 = ?', ['9', '7', '8', '12'], ['Which number times 8 makes 72?', 'Count in 8s: 8, 16, 24 … how many steps to 72?'], '8 × 9 = 72, so 72 ÷ 8 = 9.'),
          mc('math.multiplication', 'A football team has 11 players. How many players are there in 5 teams?', ['55', '50', '56', '65'], ['Multiply 11 by 5.', '10 × 5 = 50, plus 1 × 5.'], '11 × 5 = 55 players.'),
          mc('math.division', '48 pencils are shared equally among 6 students. How many pencils does each get?', ['8', '6', '7', '9'], ['Share means divide: 48 ÷ 6.', 'Which number times 6 makes 48?'], '6 × 8 = 48, so each gets 8 pencils.'),
          mc('math.multiplication', '7 × 7 = ?', ['49', '42', '56', '77'], ['This is a square number.', '7 × 7 = 7 × 5 + 7 × 2.'], '35 + 14 = 49.'),
        ],
      },
      {
        name: 'Fraction Falls', difficulty: 4, xpPerCorrect: 15, xpReward: 75,
        intro: 'The waterfall splits into parts. Can you master fractions, decimals and percentages?',
        learningObjective: 'Understand simple fractions, decimals and percentages.',
        challenges: [
          mc('math.fractions', 'What is ½ of 20?', ['10', '5', '15', '20'], ['Half means split into 2 equal parts.', '20 ÷ 2 = ?'], 'Half of 20 is 20 ÷ 2 = 10.'),
          mc('math.fractions', 'Which fraction is the biggest?', ['¾', '¼', '½', '⅓'], ['Picture a bread cut into equal pieces.', '¾ means 3 of 4 pieces — more than half.'], '¾ is more than ½, which is more than ⅓ and ¼.'),
          mc('math.decimals', '0.5 is the same as…', ['½', '⅕', '5', '¼'], ['0.5 means 5 tenths.', '5 tenths = 5 ÷ 10.'], '0.5 = 5/10 = ½.'),
          mc('math.fractions', 'An injera is cut into 8 equal pieces. You eat 3. What fraction did you eat?', ['3/8', '5/8', '3/5', '8/3'], ['The bottom number is how many equal pieces in total.', 'The top number is how many pieces you ate.'], 'You ate 3 out of 8 pieces: 3/8.'),
          mc('math.percentages', 'What is 25% of 80?', ['20', '25', '40', '8'], ['25% is the same as ¼.', 'Find ¼ of 80: 80 ÷ 4.'], '25% = ¼, and 80 ÷ 4 = 20.'),
          mc('math.fractions', '¼ + ¼ = ?', ['½', '¼', '1', '⅛'], ['Both pieces are quarters, so add the tops.', '¼ + ¼ = 2/4. Can you make it simpler?'], '2/4 is the same as ½.'),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- ENGLISH
  {
    slug: 'word-safari',
    name: 'Word Safari',
    tagline: 'Explore the Reading Forest with your animal friends.',
    description: 'Meet the forest animals, hunt for words and follow Amara on her journey.',
    world: 'READING_FOREST', subject: 'english', minGrade: 1, maxGrade: 6, order: 2,
    badge: { slug: 'word-master', name: 'Word Master', desc: 'Finished every level of Word Safari', glyph: '🌳', gradient: 'from-emerald-400 to-green-600' },
    levels: [
      {
        name: 'Forest Friends', difficulty: 1,
        intro: 'The animals of the Reading Forest each have a word puzzle for you.',
        learningObjective: 'Build vocabulary: meanings, opposites, same-meaning words and spelling.',
        challenges: [
          mc('english.vocabulary', 'I am very ___ because I won the race.', ['happy', 'sleep', 'tree', 'quickly'], ['Which word tells how someone feels?', 'Winning a race usually makes you feel…'], '"Happy" describes a feeling, and winning makes us happy.', 'Elephant'),
          mc('english.antonyms', 'Find the word that means the opposite of HOT.', ['cold', 'warm', 'sun', 'fire'], ['Opposite means as different as possible.', 'Think of how water feels from a fridge.'], 'The opposite of hot is cold.', 'Giraffe'),
          mc('english.vocabulary', 'Which of these words is a fruit?', ['banana', 'river', 'run', 'blue'], ['A fruit is something that grows and you can eat.', 'Monkeys love this yellow one!'], 'A banana is a fruit.', 'Monkey'),
          mc('english.synonyms', 'Which word means the same as BIG?', ['large', 'tiny', 'fast', 'soft'], ['Same meaning, different word.', 'An elephant is big. It is also…'], '"Large" means the same as "big".', 'Zebra'),
          mc('english.spelling', 'Pick the correct spelling.', ['elephant', 'elefant', 'eliphant', 'elephent'], ['The "f" sound here is written with two letters.', 'It starts with "ele" and the f-sound is "ph".'], 'E-L-E-P-H-A-N-T: elephant.', 'Lion'),
          mc('english.antonyms', 'What is the opposite of UP?', ['down', 'over', 'high', 'sky'], ['Point up, then point the other way.', 'Birds fly up; rain falls…'], 'The opposite of up is down.', 'Bird'),
        ],
      },
      {
        name: 'Grammar Grove', difficulty: 2, xpPerCorrect: 12, xpReward: 60,
        intro: 'In the Grammar Grove, sentences need the right words in the right places.',
        learningObjective: 'Use verbs, plurals, tenses and adjectives correctly.',
        challenges: [
          mc('english.grammar', 'Choose the right word: She ___ to school every day.', ['walks', 'walk', 'walking', 'to walk'], ['"She" is one person, and this happens every day.', 'For he/she/it in the present, add -s to the verb.'], '"She walks to school every day."'),
          mc('english.grammar', 'Which word is a verb (an action word)?', ['run', 'table', 'green', 'happy'], ['A verb is something you can do.', 'Can you "table"? Can you "run"?'], '"Run" is an action, so it is a verb.'),
          mc('english.grammar', 'What is the plural of "child"?', ['children', 'childs', 'childes', 'child'], ['This plural does not just add -s.', 'It is like "man" → "men" — a special word.'], 'One child, many children.'),
          mc('english.grammar', 'Fill in: Yesterday, we ___ football.', ['played', 'play', 'plays', 'playing'], ['"Yesterday" means the past.', 'Many past-tense verbs end in -ed.'], '"Yesterday, we played football." — past tense.'),
          mc('english.grammar', 'Which sentence is correct?', ['The birds are singing.', 'The birds is singing.', 'The bird are singing.', 'Birds singing is.'], ['"Birds" is more than one.', 'More than one uses "are".'], '"The birds are singing." — many birds, so "are".'),
          mc('english.grammar', 'Which word is an adjective (it describes a thing)?', ['tall', 'quickly', 'jump', 'and'], ['An adjective tells us what something is like.', 'A giraffe is very ___.'], '"Tall" describes a thing, so it is an adjective.'),
        ],
      },
      {
        name: "Amara's Journey", difficulty: 3, xpPerCorrect: 15, xpReward: 75,
        intro: 'Amara lives near Lake Tana. Every morning she helps her grandmother carry water, then walks to school with her friend Dawit. One day Dawit was sick, so after school Amara took his homework to his house. Dawit’s mother thanked her with fresh bread.',
        learningObjective: 'Read a short story and answer questions about details, order and feelings.',
        challenges: [
          mc('english.comprehension', 'Where does Amara live?', ['near Lake Tana', 'in a big city', 'on a mountain top', 'by the sea'], ['Look at the very first sentence of the story.', 'It names a lake.'], 'The story begins: "Amara lives near Lake Tana."'),
          mc('english.comprehension', 'What does Amara do first every morning?', ['helps her grandmother carry water', 'plays football', 'goes to the market', 'reads a book'], ['Find the word "morning" in the story.', 'What does she do before walking to school?'], 'Every morning she helps her grandmother carry water.'),
          mc('english.comprehension', 'Why did Amara go to Dawit’s house?', ['to bring his homework', 'to eat bread', 'to play games', 'to see a doctor'], ['What happened to Dawit that day?', 'He missed school, so he needed…'], 'Dawit was sick, so she brought him his homework.'),
          mc('english.sequencing', 'Which of these happened FIRST?', ['Amara carried water', 'Amara took Dawit his homework', 'Dawit’s mother thanked her', 'Amara got fresh bread'], ['Think about the order of the day.', 'Mornings come before "after school".'], 'Carrying water happens in the morning, before everything else.'),
          mc('english.comprehension', 'How did Dawit’s mother feel?', ['thankful', 'angry', 'bored', 'scared'], ['What did she give Amara?', 'People give gifts when they are…'], 'She thanked Amara with bread, so she felt thankful.'),
          mc('english.vocabulary', 'Which word best describes Amara?', ['kind', 'lazy', 'rude', 'noisy'], ['Think about what Amara did for her friend.', 'Helping others without being asked is…'], 'Amara helps her grandmother and her friend — she is kind.'),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- SCIENCE
  {
    slug: 'science-lab',
    name: 'Science Lab',
    tagline: 'Explore life and physics on Science Planet.',
    description: 'Zoom into a cell, balance a savanna food chain and launch balls in the physics lab.',
    world: 'SCIENCE_PLANET', subject: 'science', minGrade: 3, maxGrade: 8, order: 3,
    badge: { slug: 'science-explorer', name: 'Science Explorer', desc: 'Finished every level of Science Lab', glyph: '🔬', gradient: 'from-violet-400 to-purple-600' },
    levels: [
      {
        name: 'Cell Lab', difficulty: 3,
        intro: 'Everything alive is made of cells. Let’s explore one up close!',
        learningObjective: 'Name the main parts of a cell and what each one does.',
        challenges: [
          { ...mc('bio.cell', 'Find the NUCLEUS — the cell’s control centre.', ['Nucleus', 'Mitochondria', 'Cell membrane', 'Cytoplasm'], ['It holds the cell’s instructions (DNA).', 'It is usually the big round part in the middle.'], 'The nucleus holds DNA and controls the cell.'), setup: { scene: 'cell' } },
          { ...mc('bio.cell', 'Which part gives the cell energy?', ['Mitochondria', 'Nucleus', 'Cell membrane', 'Cytoplasm'], ['It is often called the "powerhouse".', 'It turns food into energy the cell can use.'], 'Mitochondria release energy from food.'), setup: { scene: 'cell' } },
          { ...mc('bio.cell', 'Which part controls what goes in and out of the cell?', ['Cell membrane', 'Nucleus', 'Mitochondria', 'Cytoplasm'], ['It is on the outside, like a gate.', 'It wraps around the whole cell.'], 'The cell membrane lets some things in and keeps others out.'), setup: { scene: 'cell' } },
          { ...mc('bio.cell', 'What is the jelly-like liquid that fills the cell?', ['Cytoplasm', 'Nucleus', 'Cell membrane', 'Mitochondria'], ['The other parts float in it.', 'Its name starts with "cyto", which means cell.'], 'Cytoplasm fills the cell and holds the other parts.'), setup: { scene: 'cell' } },
          mc('bio.cell', 'Plant cells have a part that animal cells don’t, used to make food from sunlight. Which is it?', ['Chloroplast', 'Nucleus', 'Cytoplasm', 'Mitochondria'], ['It is green.', 'Its name comes from "chloro", meaning green.'], 'Chloroplasts use sunlight to make food (photosynthesis).'),
          mc('bio.cell', 'What are all living things made of?', ['cells', 'rocks', 'only water', 'metal'], ['Think about what we just explored.', 'Plants, animals and people are all built from tiny…'], 'All living things are made of cells.'),
        ],
      },
      {
        name: 'Savanna Food Chain', difficulty: 4, xpPerCorrect: 12, xpReward: 60,
        intro: 'On the savanna, energy flows from the Sun to the grass to the animals. Keep the ecosystem in balance!',
        learningObjective: 'Explain food chains: producers, consumers, decomposers and energy flow.',
        challenges: [
          { ...mc('bio.ecosystem', 'Grass → Zebra → ? Which animal eats the zebra?', ['Lion', 'Grass', 'Butterfly', 'Tortoise'], ['It is a meat-eater.', 'It is called the king of the savanna.'], 'Lions eat zebras: grass → zebra → lion.'), setup: { scene: 'savanna' } },
          { ...mc('bio.ecosystem', 'Where does the energy in a food chain first come from?', ['The Sun', 'The lion', 'The soil', 'The rain'], ['Plants need it to make food.', 'It shines in the sky.'], 'Plants capture energy from the Sun; animals get it by eating.'), setup: { scene: 'savanna' } },
          mc('bio.ecosystem', 'Grass makes its own food from sunlight. So grass is a…', ['producer', 'consumer', 'decomposer', 'predator'], ['It "produces" food.', 'Animals eat; plants make.'], 'Plants are producers: they make their own food.'),
          { ...mc('bio.ecosystem', 'What happens to the zebras if all the grass dies?', ['They have less food, so their numbers go down', 'They grow bigger', 'Nothing changes', 'They start eating rocks'], ['What do zebras eat?', 'No food means…'], 'Without grass, zebras go hungry and their numbers fall — then lions have less food too.'), setup: { scene: 'savanna' } },
          mc('bio.ecosystem', 'Which of these is a decomposer?', ['Mushroom', 'Lion', 'Grass', 'Eagle'], ['Decomposers break down dead things.', 'It is a fungus that grows on old logs.'], 'Mushrooms are fungi that break down dead plants and animals.'),
          mc('bio.ecosystem', 'A lion eats other animals. So a lion is a…', ['consumer', 'producer', 'decomposer', 'plant'], ['Does a lion make its own food?', 'Animals that eat are…'], 'Lions consume (eat) other living things, so they are consumers.'),
        ],
      },
      {
        name: 'Launch Lab', difficulty: 5, xpPerCorrect: 15, xpReward: 75,
        intro: 'Change the angle and the power, launch the ball, and see how forces move things!',
        learningObjective: 'Explore how force, angle and gravity change how far an object travels.',
        challenges: [
          launch('phys.force', 'Launch the ball into the basket 20–24 m away.', 9.8, [20, 24], ['Try an angle near 45°.', 'At 45°, a power of about 15 lands near 23 m.'], 'At 45° with power 15 the ball travels about 23 m.'),
          mc('phys.force', 'You launched the ball harder (with more force). What happens to the distance?', ['It goes farther', 'It goes shorter', 'It stays the same', 'The ball stops'], ['Think about kicking a football softly and then hard.', 'More push means more speed.'], 'More force gives more speed, so the ball travels farther.'),
          launch('phys.force', 'The basket moved closer: 8–11 m away.', 9.8, [8, 11], ['You need less power than before.', 'At 45°, try a power near 10.'], 'At 45° with power 10 the ball travels about 10 m.'),
          mc('phys.motion', 'With no air slowing it down, which launch angle sends a ball the farthest?', ['45°', '10°', '80°', '90°'], ['Too low hits the ground quickly; too high goes up, not along.', 'The best angle is halfway between flat and straight up.'], '45° gives the longest distance (when there is no air resistance).'),
          launch('phys.gravity', 'On the Moon gravity is much weaker. Hit the target 60–70 m away.', 1.6, [60, 70], ['Weak gravity means the ball stays up longer.', 'At 45°, a power of just 10 goes about 62 m here.'], 'On the Moon, 45° with power 10 travels about 62 m — far more than on Earth.'),
          mc('phys.gravity', 'Why did the ball travel farther on the Moon?', ['Weaker gravity pulled it down less', 'The ball was heavier', 'There was more air', 'The Moon is hotter'], ['What pulls the ball back to the ground?', 'The Moon’s pull is about one-sixth of Earth’s.'], 'Gravity on the Moon is weaker, so the ball stays in the air longer.'),
        ],
      },
    ],
  },

  // --------------------------------------------------------------- CODING
  {
    slug: 'code-city',
    name: 'Code City',
    tagline: 'Program robots to power up Coding City.',
    description: 'Give the robot instructions with blocks, see them as Python and JavaScript, and debug broken code.',
    world: 'CODING_CITY', subject: 'coding', minGrade: 2, maxGrade: 8, order: 4,
    badge: { slug: 'code-creator', name: 'Code Creator', desc: 'Finished every level of Code City', glyph: '💻', gradient: 'from-fuchsia-400 to-indigo-600' },
    levels: [
      {
        name: 'Robot Factory', difficulty: 2,
        intro: 'The factory robot needs your instructions. Put blocks in order and press Run!',
        learningObjective: 'Write step-by-step instructions (sequences) and spot simple bugs.',
        challenges: [
          grid('code.sequence', 'Move the robot to the charging station ⚡.', { start: [0, 2], dir: 'E', goal: [3, 2], maxBlocks: 6 }, ['The station is straight ahead — count the squares.', 'Forward, Forward, Forward.'], 'Forward, Forward, Forward reaches the station.'),
          grid('code.sequence', 'The station is up and to the right. Get there!', { start: [0, 4], dir: 'E', goal: [2, 2], maxBlocks: 8 }, ['Go right first, then turn to face up.', 'Forward, Forward, Turn left, Forward, Forward.'], 'Forward ×2, turn left to face up, then Forward ×2.'),
          grid('code.sequence', 'A crate blocks the way. Go around it to reach the station.', { start: [0, 0], dir: 'E', goal: [4, 0], walls: [[2, 0]], maxBlocks: 12 }, ['Step down one row to get past the crate.', 'Forward, Right, Forward, Left, Forward, Forward, Left, Forward, Right, Forward.'], 'Drop down a row, pass the crate, come back up, and finish.'),
          mc('code.loops', 'for i in range(4):\n    move_forward()\n    turn_right()\n\nHow many times does the robot move forward?', ['4', '1', '8', '16'], ['range(4) repeats the loop 4 times.', 'Each repeat has one move_forward().'], 'The loop runs 4 times with one move each: 4 moves.'),
          mc('code.debugging', 'Which line has the bug?\n\n1  robot.moveForward()\n2  robot.turnLeft()\n3  robot.moveForward(\n4  robot.collect()', ['Line 3', 'Line 1', 'Line 2', 'Line 4'], ['Look carefully at the brackets on each line.', 'Every "(" needs a matching ")".'], 'Line 3 is missing its closing bracket ")".'),
          grid('code.sequence', 'Collect both energy cells 🔋, then reach the station.', { start: [0, 0], dir: 'E', goal: [0, 2], items: [[2, 0], [2, 2]], maxBlocks: 12 }, ['Go right to the first cell, then down to the second.', 'Forward, Forward, Right, Forward, Forward, Right, Forward, Forward.'], 'Collect the top cell, go down to the second, then turn and drive home.'),
        ],
      },
      {
        name: 'Smart Traffic', difficulty: 3, xpPerCorrect: 12, xpReward: 60,
        intro: 'The city’s traffic lights need loops, conditions and variables.',
        learningObjective: 'Read loops, if-conditions and variables in Python and JavaScript.',
        challenges: [
          mc('code.loops', 'for (let i = 0; i < 3; i++) {\n  robot.move();\n}\n\nHow many times does the robot move?', ['3', '2', '4', '0'], ['i starts at 0 and stops before 3.', 'Count: i = 0, 1, 2.'], 'i takes the values 0, 1 and 2 — three moves.'),
          mc('code.conditions', 'if light == "red":\n    stop()\nelse:\n    go()\n\nThe light is red. What does the car do?', ['stop', 'go', 'crash', 'nothing'], ['Check the condition: is light equal to "red"?', 'When the condition is true, the first block runs.'], 'light == "red" is true, so stop() runs.'),
          mc('code.variables', 'x = 5\nx = x + 2\n\nWhat is x now?', ['7', '5', '2', '52'], ['The second line uses the old value of x.', 'x + 2 = 5 + 2.'], 'x becomes 5 + 2 = 7.'),
          grid('code.sequence', 'Drive around the broken lights to reach the station.', { start: [0, 0], dir: 'E', goal: [4, 4], walls: [[1, 1], [2, 2], [3, 3]], maxBlocks: 10 }, ['The edges of the grid are clear — go all the way right, then all the way down.', 'Forward ×4, turn right, Forward ×4.'], 'Forward ×4, turn right, Forward ×4 follows the clear edge.'),
          mc('code.loops', 'Which of these loops repeats forever?', ['while True:', 'for i in range(3):', 'if x > 2:', 'print("hi")'], ['Which one never becomes false?', '"True" is always true.'], '"while True:" keeps looping because its condition never ends.'),
          mc('code.debugging', 'robot.turn_left\n\nThe robot did not turn. What is missing?', ['the brackets ()', 'a semicolon', 'a colon', 'quotes'], ['To run a function you have to call it.', 'Calling a function needs something after its name.'], 'turn_left() needs brackets to actually run.'),
        ],
      },
      {
        name: 'Smart Farm', difficulty: 4, xpPerCorrect: 15, xpReward: 75,
        intro: 'Help the farm robot water the crops, then teach an AI helper good rules.',
        learningObjective: 'Plan longer programs, use functions and think about AI behaviour.',
        challenges: [
          grid('code.sequence', 'Water all three plants 🌱, then park at the station.', { start: [0, 0], dir: 'E', goal: [4, 2], items: [[1, 0], [3, 0], [3, 2]], maxBlocks: 10 }, ['The first two plants are in the top row.', 'Forward ×3, turn right, Forward ×2, turn left, Forward.'], 'Top row first, down to the third plant, then one step to the station.'),
          mc('code.functions', 'def water():\n    move_forward()\n    pour()\n\nwater()\nwater()\n\nHow many times does the robot pour?', ['2', '1', '0', '4'], ['The function is defined once but called…', 'Count the lines that say water().'], 'water() is called twice, so pour() runs twice.'),
          mc('code.strings', 'What does this print?\n\nprint(3 * "ab")', ['ababab', 'ab3', '9', 'an error'], ['Multiplying text repeats it.', '"ab" three times in a row.'], '3 * "ab" repeats the text: ababab.'),
          mc('code.lists', 'Which of these is a list in Python?', ['[1, 2, 3]', '(1 2 3)', '{1-2-3}', '<1,2,3>'], ['Python lists use square brackets.', 'Items are separated by commas.'], '[1, 2, 3] is a Python list.'),
          grid('code.sequence', 'Find a way through the maze to the station.', { start: [0, 4], dir: 'N', goal: [4, 0], walls: [[0, 2], [1, 2], [2, 2], [3, 0], [3, 1]], maxBlocks: 12 }, ['You can only go up one square before the wall.', 'Up 1, then right along row 3, then up the right-hand side.'], 'Forward, turn right, Forward ×4, turn left, Forward ×3.'),
          mc('code.ai', 'You are designing an AI helper for students. What should it do when it is not sure of an answer?', ['Say it is not sure and suggest asking a teacher', 'Guess confidently', 'Make up a source', 'Ignore the question'], ['Good helpers are honest.', 'Is a confident wrong answer helpful?'], 'A good AI helper admits when it is unsure and points to a trusted person.'),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- HISTORY
  {
    slug: 'africa-history-quest',
    name: 'Africa History Quest',
    tagline: 'Time-travel to great African civilisations.',
    description: 'Visit Aksum, the Nile Valley and Great Zimbabwe, meet their people and learn how we know about the past.',
    world: 'HISTORY_WORLD', subject: 'history', minGrade: 3, maxGrade: 8, order: 5,
    badge: { slug: 'history-explorer', name: 'History Explorer', desc: 'Finished every level of Africa History Quest', glyph: '🏛️', gradient: 'from-amber-400 to-orange-600' },
    levels: [
      {
        name: 'Ancient Aksum', difficulty: 3,
        intro: 'Time machine set to about 1,700 years ago — the Kingdom of Aksum, in today’s northern Ethiopia and Eritrea.',
        learningObjective: 'Describe how Aksum grew through trade, its stelae, coins and Ge’ez script.',
        challenges: [
          mc('history.aksum', 'What helped the Kingdom of Aksum grow rich and powerful?', ['Trade across the Red Sea and beyond', 'Gold mines in Europe', 'Selling cars', 'Building airports'], ['Aksum was close to the Red Sea.', 'Merchants brought ivory, gold and goods from far away.'], 'Aksum became rich by trading with Egypt, Arabia, India and the Roman world across the Red Sea.'),
          mc('history.aksum', 'What are the tall carved stone pillars of Aksum called?', ['Stelae (obelisks)', 'Pyramids', 'Castles', 'Towers'], ['They are tall, thin and made of one stone.', 'The word starts with "st".'], 'Aksum’s giant carved stones are called stelae (obelisks).'),
          mc('history.aksum', 'Aksum made its own coins. Why did that matter?', ['It made trade easier and showed the kingdom’s power', 'Coins were used as toys', 'It stopped all trade', 'Coins were only decorations'], ['Think about buying and selling in a market.', 'Few kingdoms of the time made their own coins.'], 'Its own coins made trade easier and showed Aksum as a major power.'),
          mc('history.aksum', 'Through which Red Sea port did Aksum trade?', ['Adulis', 'Lagos', 'Cairo', 'Mombasa'], ['It was on the Red Sea coast, in today’s Eritrea.', 'Its name starts with "A".'], 'Adulis was Aksum’s main port on the Red Sea.'),
          mc('history.aksum', 'Which king of Aksum adopted Christianity in the 300s?', ['Ezana', 'Tewodros II', 'Menelik II', 'Haile Selassie'], ['He ruled about 1,700 years ago.', 'His name appears on Aksumite coins and stone inscriptions.'], 'King Ezana adopted Christianity in the 4th century (the 300s).'),
          mc('history.aksum', 'Aksum’s writing, whose script is still used for Amharic and Tigrinya today, is called…', ["Ge'ez", 'Latin', 'Hieroglyphs', 'Chinese'], ['Its script is the Ethiopic script.', 'The church still uses this language today.'], "Ge'ez was Aksum's language; its script is still used for Amharic and Tigrinya."),
        ],
      },
      {
        name: 'The Nile Valley', difficulty: 3, xpPerCorrect: 12, xpReward: 60,
        intro: 'Follow the Nile, one of the longest rivers in the world, to ancient Egypt and Kush.',
        learningObjective: 'Explain why the Nile mattered to ancient Egypt and Kush.',
        challenges: [
          mc('history.nile', 'The Nile flows north. Into which sea does it empty?', ['The Mediterranean Sea', 'The Red Sea', 'The Indian Ocean', 'The Atlantic Ocean'], ['It reaches the sea in northern Egypt.', 'This sea lies between Africa and Europe.'], 'The Nile flows north and empties into the Mediterranean Sea.'),
          mc('history.nile', 'The Blue Nile flows out of which lake in Ethiopia?', ['Lake Tana', 'Lake Victoria', 'Lake Chad', 'Lake Malawi'], ['It is Ethiopia’s largest lake.', 'Amara from Word Safari lives near it!'], 'The Blue Nile flows out of Lake Tana in Ethiopia.'),
          mc('history.nile', 'Why did ancient Egyptian farmers depend on the Nile’s yearly flood?', ['It left rich, wet soil for crops', 'It brought snow', 'It made the desert bigger', 'It carried cars'], ['What do crops need to grow?', 'After the water went down, dark mud was left behind.'], 'The flood left fertile mud that made the land good for farming.'),
          mc('history.nile', 'The Great Pyramids of Giza were built as…', ['tombs for pharaohs', 'markets', 'schools', 'ships'], ['Pharaohs were Egypt’s kings.', 'They were built to protect a king after death.'], 'The pyramids were tombs for Egyptian pharaohs.'),
          mc('history.nile', 'Ancient Egyptian picture-writing is called…', ['hieroglyphs', 'emojis', "Ge'ez", 'Latin'], ['It uses little pictures and symbols.', 'The word starts with "hiero".'], 'Egyptians wrote in hieroglyphs.'),
          mc('history.nile', 'The Kingdom of Kush, south of Egypt in today’s Sudan, is also famous for building…', ['pyramids', 'skyscrapers', 'railways', 'submarines'], ['Think about what Egypt built.', 'Sudan has even more of them than Egypt!'], 'Kush built many pyramids, especially at Meroë in today’s Sudan.'),
        ],
      },
      {
        name: 'Kingdoms of Trade', difficulty: 4, xpPerCorrect: 15, xpReward: 75,
        intro: 'Visit Great Zimbabwe and the West African empires linked by trade across the Sahara.',
        learningObjective: 'Describe Great Zimbabwe, Mali and trans-Saharan trade, and how historians know the past.',
        challenges: [
          mc('history.kingdoms', 'Great Zimbabwe is famous for huge walls built from…', ['stone blocks fitted together without mortar', 'glass', 'steel', 'plastic'], ['The builders used what the land gave them.', 'The blocks stay up without any cement.'], 'Its walls are made of granite blocks fitted together without mortar.'),
          mc('history.kingdoms', 'The city of Timbuktu in Mali became famous as a centre of…', ['learning and books', 'car factories', 'skiing', 'space travel'], ['Scholars came from far away to study there.', 'Thousands of old manuscripts survive there.'], 'Timbuktu was a great centre of learning with many manuscripts.'),
          mc('history.kingdoms', 'Mansa Musa was a famous ruler of which West African empire?', ['The Mali Empire', 'Aksum', 'The Roman Empire', 'The Zulu Kingdom'], ['He ruled about 700 years ago.', 'Timbuktu was part of his empire.'], 'Mansa Musa ruled the Mali Empire in the 1300s.'),
          mc('history.kingdoms', 'Which animal carried goods across the Sahara Desert?', ['camels', 'penguins', 'kangaroos', 'dolphins'], ['It can travel a long time without water.', 'It is sometimes called the "ship of the desert".'], 'Camel caravans carried goods across the Sahara.'),
          mc('history.kingdoms', 'Two goods often traded across the Sahara were…', ['gold and salt', 'phones and cars', 'ice and snow', 'plastic and rubber'], ['One was mined in West Africa; the other was needed to keep food.', 'One shines; one you put on food.'], 'West African gold was traded for salt from the Sahara.'),
          mc('history.method', 'How do historians learn about the past?', ['From objects, buildings and writings people left behind', 'Only by guessing', 'From video games', 'From dreams'], ['Think about what we explored: stelae, coins, manuscripts.', 'Evidence is something real we can study.'], 'Historians study evidence: objects, buildings, coins and writings.'),
        ],
      },
    ],
  },
];
