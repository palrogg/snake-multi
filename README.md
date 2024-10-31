# Snake-Multi

Quick multiplayer snake with [Colyseus](https://colyseus.io/) and [Phaser](https://phaser.io/).

Sprites by [Bas de Reuver](https://opengameart.org/content/snake-sprites-2d)

Run locally:
`cd server; npm run`
`cd client; npm run`

Build client:
`cd client; npx parcel build index.html --public-url /snake/ --dist-dir snake`

- [x] Synchronize player movements
- [x] Spawn food
- [x] Client-side physics with server-side validation
- [x] Make snakes grow when they eat
- [x] Create death sequence
- [ ] Fine-tune server-client sync
  - [x] Server validation should take snake tails into account
  - [x] Sync available food (for now: not synced with other players than the one who ate it)
- [ ] Mobile-friendly
  - [ ] Same Phaser config as [Quatre apparts](https://github.com/GameLab-UNIL-EPFL/quatre-apparts-et-un-confinement)?
  - [ ] Mobile inputs cf. "Space"
- [x] Add a leaderboard
  - [x] React or Phaser? Phaser
  - [x] LeaderBoard template
  - [x] Connect with Player schema
  - [x] Sync score updates
  - [ ] Update score after 200ms timeout, or at a timed interval
- [x] Start screen with debug toggle
- [ ] Fixes
  - [x] Collide vs overlap for enemies
  - [ ] Solve head vs tail issue: take head direction into account
  - [ ] Head-to-head: both should die
- [ ] Make it cleaner and better
  - [ ] New players should not spawn directly in front of existing players
  - [x] Snake class should contain everything snake-related

  ## Ressources
  
  [Phaser Documentation](https://docs.phaser.io/api-documentation/api-documentation)
