# Soundbytes

Design notes for the Soundbytes game, agreed with the owner before the UI was built.
This first phase is the UI only, played on mock boards with placeholder audio.
Rules decided where this file is silent are in [ASSUMPTIONS.md](../ASSUMPTIONS.md) under "Soundbytes".

## Open before the audio phase

The project's hard rules say we never host film audio, and sound only plays through a visible YouTube embed.
YouTube's terms also rule out audio-only or edited playback.
Soundbytes as designed needs hosted clips, some of them altered, so the owner must decide where the audio comes from before the audio pipeline is built.
If the real clip ends up being a visible YouTube player, the revealed state changes from playing inside the node to opening a player.

## Game

- One hidden film per board; the player guesses it from short audio clips.
- A board has 6 audio nodes.
  Each has a short label that is itself a clue ("Villain", "Fight music", "Footsteps") and a category: dialogue, score or sound effect.
  Labels name a role or a kind of sound, never a character, place or signature thing ("Reverend Mother", "Thumper"): the board must not give the film away before a single clip is played.
- Each node has two clips: a disguised one of about 2 seconds and the real one of about 6.
  Dialogue is disguised with a helium voice, score with a kazoo, sound effects are muffled.
- The player starts with a pool of points.
  Buying a locked node costs points and opens its disguised clip; removing the disguise costs points and opens the real clip.
- One node is free: it starts bought, in its disguised state, in the board's larger center slot.
- 3 guesses, each a film or an actor, picked from one search box that suggests both.
  A correct actor (one in the film's cast) gives bonus points, uses a guess, does not end the game and stays pinned on the board as a name tag.
  Only the right film wins.
- Points left at the end are the score; a lost or abandoned game scores 0.
- After the game every node plays its real clip for free, so players can listen back.

## Look

- The board is a hand-pinned detective evidence board, not a grid: 6 fixed slots, the same every day, each with a small fixed offset and tilt.
- No connecting lines, and no decoration that looks tappable; texture only (paper, tape, pins).
- Every board has the same surface: the woven cloth of a vintage hi-fi speaker, in a walnut frame.
  A surface per film was tried and dropped: it could give the film away, and the livelier ones (vibrating sand, pegboard) distracted from the clips.
- The main screen has almost no text: node labels, the points count and the guess box.
  Everything else is an icon with an accessible name: coin and number for points, 3 dots for guesses, a white flag to give up, coin chips for prices.

## Nodes and interaction

- Score nodes are records pinned to the board.
  Dialogue nodes are felt hand puppets, and sound-effect nodes are clapperboards.
  Both characters talk while their clip plays, with two pieces moving like a hand puppet's mouth: the puppet's head lifts off its jaw, and the clapstick (carrying the eyes) flaps open over the slate.
  The same characters play every role, in three colours or personalities and never with skin tones, so they can't resemble the real cast.
- Locked: greyed out, label fully readable, price chip on the node.
- Bought: full color, with the disguise object attached and the removal price on it: a balloon on a string (helium), a kazoo sticking out (kazoo) or a little door in front (muffle).
- Revealed: the object is gone.
- A ring around a record shows the clip's length (a short arc for the disguised clip, the full ring for the real one) and fills as it plays; characters show no ring.
- Tap plays and taps again to stop; only one clip plays at a time.
- Hold (about 700 ms) spends: on a locked node it buys, on a bought node it removes the disguise.
  The hold animation is the effect: the balloon inflates until it pops, the kazoo slides out and flies off, the door creaks open.
  Letting go early costs nothing; a node the player can't afford shakes.
- Before anything counts, a headphones icon covers the board until the player taps the free node.
- On the very first visit a pulsing hand shows the tap on the free node, then the hold on its disguise.

## Not in this version

- Connecting lines between nodes, and 3D scenes.
- The audio pipeline (clip extraction, disguises, labels and node art) and an admin editor.

## Later

- The characters' talking follows the playing clip's loudness today.
  Later it should be driven by the clip's own audio track, ideally lip sync from the real dialogue, so the mouth and head move with the actual words.
