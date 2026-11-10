# Soundbytes

Design notes for the Soundbytes game, agreed with the owner before the UI was built.
Boards come from the audio pipeline in [tools/soundbytes-lab](../tools/soundbytes-lab/README.md); tests play a board of synthesized placeholder sounds.
Rules decided where this file is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Soundbytes".

## Audio sources

Decided by the owner before the audio phase.
Everything is automatic, as in the collage: no clip or line is picked by hand.

- Dialogue comes from the film's official videos on YouTube, found through TMDB's video list, and is used under fair use: one line of about 4 seconds, far too short to stand in for the film.
  Scene clips come first, since they are the film's own sound. Trailers only fill in, and only with voices also heard in a scene clip, so a trailer's narrator never gets a node; a film needs at least 4 scene clips to get a board.
  A local tool on the owner's PC downloads the videos, separates the voices from music and effects with an open-source stem separator, finds whole lines in a speech transcript and cuts them into MP3s.
  Cuts follow where a voice detector hears the speech start and stop, and the rest of the soundtrack goes back in far below the voice, since a voice stripped bare sounds hollow.
  Lines that say the film's title are dropped, so a clip can't give the answer away on its own.
  Character names, places and people are allowed: the owner found the game too hard and wants it easier (2026-11-10).
  Clips have generic names and no metadata, live in the database and are served from our own route under opaque ids, like collage tiles.
- There are no disguises, and no short cuts of a line: after playtests the owner dropped both, since the game is hard enough without. Every clip is a whole line, unaltered.
- Every clip comes with a mouth track: how loud the voice alone is, frame by frame, so the characters talk to the words and not to the soundtrack under them.
- Takedown requests are acted on promptly. The footer says clips are short excerpts and gives `contact@absolutecinemadle.fun` (forwarded by ImprovMX); the site does not link the GitHub repo (the owner's call).
  Each clip's source (video and time) is kept server-side, so a request can be traced to its clip.

## Clues: from ordinary to iconic, then the theme

Agreed with the owner on 2026-11-10, since the game was too hard: a board keeps 5 tries, but its clues get easier.

1. A side character's ordinary line.
2. A lead's ordinary line.
3. An iconic line.
4. The most iconic line.
5. The film's theme.

A film without a theme on iTunes gets a third iconic line instead; with too few iconic lines, ordinary ones fill in.
Labels are "Line 1" to "Line 4" and "Theme": naming roles from the voice grouping was tried and was too often wrong.

- Iconic lines are ranked by signals that need no key: an official clip's title quoting the line ("King of the World"), the film's Wikiquote page (bolded or captioned quotes count most), YouTube's most-replayed peak landing on the line, and the clip's view count.
  A Claude Code agent in the lab then orders each film's shortlist by how famous the lines are (see "Judging" in the lab's README).
  Checked on Titanic: the "King of the World" clip's most-replayed peak is the line itself.
- The theme comes from Apple's servers: the iTunes Search API's 30-second preview of the soundtrack's best-known track (the composer's, from TMDB, so a cover band's album doesn't count), played unaltered from Apple and never copied; the board plays its loudest 12 seconds.
  It is a record on the board, and after the game the result links to the track on Apple Music.
  A window that sings the title is avoided.
  Matching previews against the film's official clips was tried to find the theme and dropped: those clips are mostly dialogue, and every cue of a score matched them about equally.
- Sound effects are still out: nothing automatic tells an iconic effect from a generic one yet.
  A possible later step: a Claude Code agent names the film's famous sounds, an open-source sound-search model finds them in the official clips' effects track, and only a sound heard in at least 2 videos is used.

## Game

- Soundbytes is a daily, like Close-Ups: `/soundbytes` is today's board by the player's own date (the home card goes straight there), `/soundbytes/<date>` an earlier day and `/soundbytes/archive` lists every day so far.
- One hidden film per board; the player guesses it from lines of its dialogue, played like Heardle.
- A board has 5 clues (see "Clues" above), and so 5 tries. Line 1 is open from the start, in the board's larger center slot.
  Every miss (a wrong guess, or a skip) opens the next line; a miss with every line open ends the game.
- Labels never name a character, place or signature thing ("Reverend Mother", "Thumper"): the board must not give the film away before a single clip is played.
- There are no points: as in Wordle, getting it early feels better, but what counts is not failing.
  The result says which line the film was named on ("2/5", or "X/5" when missed), and Share copies that with a square per line.
- A Skip on the last line ends the game, so it reads "Give up" there and needs a second press ("Give up?") within 3 seconds.
- Guesses are a film or an actor, picked from one search box that suggests both.
  A correct actor (one in the film's top-billed cast) is free: it uses no try and is pinned on the board as a name tag, a hint toward the film. Only the film wins.
- After the game every line is open, so players can listen back.

## Look

- The board is a hand-pinned detective evidence board, not a grid: 5 fixed slots, the same every day, each with a small fixed offset and tilt.
- No connecting lines, and no decoration that looks tappable; texture only (paper, tape, pins).
- Every board has the same surface: the woven cloth of a vintage hi-fi speaker, in a walnut frame.
  A surface per film was tried and dropped: it could give the film away, and the livelier ones (vibrating sand, pegboard) distracted from the clips.
- One screen, no scrolling, on a phone (390 × 844) and a desktop (1280 × 800), laid out like Close-Ups: a top bar (back, the name and day number, the archive, help), the board as large as the height allows, the guess row, the misses as chips, and the footer line.
- The main screen has almost no text: line labels, the guess box and its Skip button; rules live only in the help dialog, which opens by itself on a first visit.
- The board is also the try counter, so there is no separate one: a line whose try was spent gets a red marker cross on its tape, the line the film was named on turns gold, and a locked line is grey with a padlock.

## Nodes and interaction

- Score nodes are records pinned to the board.
  Dialogue nodes are felt sock puppets seen side on, facing the middle of the board, and sound-effect nodes are clapperboards.
  Both talk with a mouth hinged at the back: the puppet's head tips up as its jaw swings down, and the clapstick (carrying the eyes) flaps open over the slate.
  The motion is snappy and goofy, not smooth: the mouth snaps between shut, half and wide open with the voice, and the head swings gently to the other side on every new syllable, further the louder the voice.
  The puppets have wild hair, big lidless ping-pong eyes looking ahead, a mouth open to the board behind it like a sock puppet's, and a pom-pom or droopy nose.
  The same characters play every role, in three colours or personalities and never with skin tones, so they can't resemble the real cast.
- Locked: greyed out, label fully readable, a padlock beside it; tapping it shakes it.
- Open: full colour; a line pops into colour when a miss opens it.
- A ring around a record shows the clip's length and fills as it plays; characters show no ring.
- Tap plays and taps again to stop; only one clip plays at a time. Nothing is bought or held.
- Before anything counts, a headphones icon covers the board until the player taps line 1.
- On the very first visit a pulsing hand shows the tap on line 1.

## Not in this version

- Connecting lines between nodes, and 3D scenes.
- Sound effects, art on the theme record and an admin editor.

## Later

- The characters talk to the voice's loudness today.
  Later it could be real lip sync from the dialogue, so the mouth shapes follow the actual words.
