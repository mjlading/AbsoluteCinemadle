/*
 * The hand-picked lists Deep Cut builds prompts from.
 *
 * Themes are TMDB keyword ids, each checked by eye on 2026-11-15: the keyword's
 * most-voted films are what a player would name (Jaws for sharks, Groundhog Day
 * for a time loop), and a sample of obvious answers carries it (Raging Bull and
 * Cinderella Man are tagged boxing, Heat heist, Looper time travel). A film fits a
 * theme with any of its keyword ids; close keywords are added where a common answer
 * was missing (TMDB tags unevenly, so some fitting films are still refused). Left out after checking: "based on a true
 * story" (too vague), "spy" (Inception tops it), "space travel" and "dystopia"
 * (Star Wars and much else untagged), "wedding" and "survival" (vague tagging).
 */

export interface Theme {
  /** The prompt, as the player reads it. */
  text: string;
  keywordIds: number[];
}

export const THEMES: readonly Theme[] = [
  // heist, bank robbery
  { text: "A heist film", keywordIds: [10051, 15363] },
  { text: "A film with time travel", keywordIds: [4379] },
  { text: "A film with a time loop", keywordIds: [10854] },
  { text: "A film with sharks", keywordIds: [15097] },
  { text: "A film with zombies", keywordIds: [12377] },
  { text: "A film with vampires", keywordIds: [3133] },
  { text: "A film with werewolves", keywordIds: [12564] },
  { text: "A film with dinosaurs", keywordIds: [12616] },
  // robot, cyborg, android: The Terminator is tagged cyborg, not robot.
  { text: "A film with robots or cyborgs", keywordIds: [14544, 679, 803] },
  { text: "A film about a serial killer", keywordIds: [10714] },
  { text: "A haunted house film", keywordIds: [3358] },
  { text: "A superhero film", keywordIds: [9715] },
  { text: "A film set after the end of the world", keywordIds: [4458] },
  { text: "A film with pirates", keywordIds: [12988] },
  { text: "A boxing film", keywordIds: [209476] },
  { text: "A film about a hitman", keywordIds: [2708] },
  { text: "A Christmas film", keywordIds: [207317] },
  { text: "A film about an alien invasion", keywordIds: [14909] },
  { text: "A film with witches", keywordIds: [616] },
  { text: "A film with ghosts", keywordIds: [162846] },
  { text: "A prison escape film", keywordIds: [9777] },
  { text: "A road trip film", keywordIds: [7312] },
  // giant monster, kaiju
  { text: "A giant monster film", keywordIds: [11100, 161791] },
  { text: "A film with samurai", keywordIds: [1462] },
  { text: "A film set in a high school", keywordIds: [6270] },
  { text: "A film about a con artist", keywordIds: [10453] },
  { text: "A film with dragons", keywordIds: [12554] },
  { text: "A baseball film", keywordIds: [1480] },
  // treasure hunt, treasure map, lost or sunken treasure, treasure hunting: The Goonies has only the map.
  // Not "buried treasure": it puts The Hobbit on top.
  { text: "A treasure hunt film", keywordIds: [6956, 11088, 169953, 10733, 299841] },
  { text: "A film with an exorcism", keywordIds: [2626] },
  { text: "A found footage film", keywordIds: [163053] },
  // gangster, mafia: The Untouchables and Miller's Crossing are tagged gangster only.
  { text: "A gangster film", keywordIds: [3149, 10391] },
  { text: "A musical", keywordIds: [4344] },
  { text: "A film set in World War II", keywordIds: [1956] },
  { text: "A film about the Vietnam War", keywordIds: [2957] },
  { text: "An American football film", keywordIds: [579] },
  { text: "A basketball film", keywordIds: [6496] },
  { text: "A courtroom drama", keywordIds: [214780] },
];

/**
 * TMDB genres a genre-and-decade prompt can name, with how the prompt says them.
 * Drama, family, music, history and mystery are left out: too broad or too loosely tagged to judge
 * (TMDB calls 2001: A Space Odyssey a mystery).
 */
export const GENRES: readonly { id: number; name: string }[] = [
  { id: 28, name: "An action film" },
  { id: 12, name: "An adventure film" },
  { id: 16, name: "An animated film" },
  { id: 35, name: "A comedy" },
  { id: 80, name: "A crime film" },
  { id: 14, name: "A fantasy film" },
  { id: 27, name: "A horror film" },
  { id: 10749, name: "A romance" },
  { id: 878, name: "A science fiction film" },
  { id: 53, name: "A thriller" },
  { id: 10752, name: "A war film" },
  { id: 37, name: "A western" },
];

export const ANIMATION_GENRE = 16;
export const DOCUMENTARY_GENRE = 99;
export const TV_MOVIE_GENRE = 10770;
