/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable prefer-const */

let myFont // The font we'll use throughout the app

let gameOver = false // If it's true the game will render the main menu
let gameBeginning = true // Should be true only before the user starts the game for the first time
let canEnd = false

let floatingTexts = []
let comboTexts = []

// Game Objects
let balloons = []
let dryLine
let shooter
let shootingBalloon
let particles = []

// Game Stuffs
let isBalloonColored
const getBalloonSettings = (color, image) => {
  if (isBalloonColored) {
    return { color }
  }
  return { image }
}
let shooterRotateLimit
let shootingBalloons = []
let balloonTypes = []

const balloonGridRows = 3 // No. of rows in balloon grid
let balloonGridDistance
let balloonGridRowWidth

let startingGameTimer
let gameTimer
let gameTimerEnabled = false
let gameOverRectangleHeight = 0 // for game over animation

let canScore = false

// Buttons
let playButton
let soundButton
let leaderboardButton
let endButton

// Score data
let startingLives
let scoreGain
let score = 0

// Images
let imgShooter
let imgBalloons = []
let imgLife
let imgBackground

// Audio
let sndMusic
let sndTap
let sndMatch
let sndEnd
let sndLife
let sndBalloonShot

let soundEnabled = true
let canMute = true

let soundImage
let muteImage

// Size stuff
let objSize // Base size modifier of all objects, calculated based on screen size
let balloonOccupancy = 0.8 // how much of the screen will balloons occupy

/**
 * @description Game size in tiles
 * using bigger numbers will decrease individual object sizes but allow more objects to fit the screen
 * Keep in mind that if you change this, you might need to change text sizes as well
 */
const gameSize = 18 // recommended -> 18

// Mobile
let isMobile = false
let touching = false // Whether the user is currently touching/clicking

// Load assets
function preload() {
  // Load font from google fonts link provided in game settings
  const link = document.createElement('link')
  link.href = Koji.config.strings.fontFamily
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  myFont = getFontFamily(Koji.config.strings.fontFamily)
  const newStr = myFont.replace('+', ' ')
  myFont = newStr

  // Load settings from Game Settings
  isBalloonColored = Koji.config.strings.useColors
  scoreGain = parseInt(Koji.config.strings.scoreGain)
  startingLives = parseInt(Koji.config.strings.lives)
  comboTexts = Koji.config.strings.comboTexts.split(',')
  startingGameTimer = parseInt(Koji.config.strings.gameTimer)
  lives = startingLives

  // Timer stuff
  if (startingGameTimer <= 0) {
    gameTimer = 99999
    gameTimerEnabled = false
  } else {
    gameTimer = startingGameTimer
    gameTimerEnabled = true
  }

  // Load background if there's any
  if (Koji.config.images.background !== '') {
    imgBackground = loadImage(Koji.config.images.background)
  }

  // Load images
  imgShooter = loadImage(Koji.config.images.shooterImage)
  imgBalloons[0] = loadImage(Koji.config.images.balloonImage1)
  imgBalloons[1] = loadImage(Koji.config.images.balloonImage2)
  imgBalloons[2] = loadImage(Koji.config.images.balloonImage3)
  imgBalloons[3] = loadImage(Koji.config.images.balloonImage4)
  imgBalloons[4] = loadImage(Koji.config.images.bombImage)

  imgLife = loadImage(Koji.config.images.lifeIcon)
  soundImage = loadImage(Koji.config.images.soundImage)
  muteImage = loadImage(Koji.config.images.muteImage)

  /**
   * Load Sounds here
   * Include a simple IF check to make sure there is a sound in config, also include a check when you try to play the sound, so in case there isn't one, it will just be ignored instead of crashing the game
   * Music is loaded in setup(), to make it asynchronous
   */
  if (Koji.config.sounds.tap) sndTap = loadSound(Koji.config.sounds.tap)
  if (Koji.config.sounds.match) sndMatch = loadSound(Koji.config.sounds.match)
  if (Koji.config.sounds.end) sndEnd = loadSound(Koji.config.sounds.end)
  if (Koji.config.sounds.life) sndLife = loadSound(Koji.config.sounds.life)
  if (Koji.config.sounds.enemyDestroy)
    sndBalloonShot = loadSound(Koji.config.sounds.enemyDestroy)
}

// Setup your props
function setup() {
  width = window.innerWidth
  height = window.innerHeight

  // How much of the screen should the game take, this should usually be left as it is
  let sizeModifier = 0.75
  if (height > width) {
    sizeModifier = 1
  }

  createCanvas(width, height)

  // Magically determine basic object size depending on size of the screen
  objSize = floor(
    min(floor(width / gameSize), floor(height / gameSize)) * sizeModifier
  )
  scoreSize = objSize * 1

  isMobile = detectMobile()

  textFont(myFont) // set our font
  document.body.style.fontFamily = myFont

  playButton = new PlayButton()
  soundButton = new SoundButton()
  leaderboardButton = new LeaderboardButton()
  endButton = new EndButton()

  gameBeginning = true

  /**
   * Load game assets here
   */
  balloonGridDistance = objSize * 0.4 // <- don't change this
  balloonGridRowWidth = isMobile ? gameSize * 0.6 : gameSize * 1 // this is what part of screen balloons will occupy
  shooterRotateLimit = isMobile ? objSize * 3 : objSize * 7
  balloonTypes = [
    {
      type: 1,
      colored: isBalloonColored,
      color: Koji.config.colors.balloonColor1,
      image: imgBalloons[0],
    },
    {
      type: 2,
      colored: isBalloonColored,
      color: Koji.config.colors.balloonColor2,
      image: imgBalloons[1],
    },
    {
      type: 3,
      colored: isBalloonColored,
      color: Koji.config.colors.balloonColor3,
      image: imgBalloons[2],
    },
    {
      type: 4,
      colored: isBalloonColored,
      color: Koji.config.colors.balloonColor4,
      image: imgBalloons[3],
    },
  ]

  // Instantiate objects
  const balloonType = random(balloonTypes)

  shooter = new Shooter(
    { x: width / 2, y: height - objSize * 2 },
    { width: 2 * objSize, height: 4 * objSize },
    {
      shape: 'rectangle',
      image: imgShooter,
      color: { r: 255, g: 255, b: 255 },
      rotate: true,
    }
  )

  shootingBalloon = new Balloon(
    {
      x: width / 2,
      y: height - objSize * 1.6,
    },
    { radius: 0.7 * objSize },
    {
      shape: 'circle',
      rotate: false,
      shootingBalloon: true,
      type: balloonType.type,
      ...getBalloonSettings(balloonType.color, balloonType.image),
    }
  )

  dryLine = new Line(
    { x: 0, y: height * 0.2 + objSize * balloonGridRows * 1.4 + objSize },
    { x: width, y: height * 0.2 + objSize * balloonGridRows * 1.4 + objSize },
    { color: '#ffffff', strokeWeight: 1, shape: 'line', alpha: 0.25 }
  )

  spawnBalloons() // <- load balloons in grid

  /**
   * Load music asynchronously and play once it's loaded
   * This way the game will load faster
   */
  if (Koji.config.sounds.backgroundMusic)
    sndMusic = loadSound(Koji.config.sounds.backgroundMusic, () =>
      playMusic(sndMusic, 0.4, false)
    )
}

// An infinite loop that never ends in p5
function draw() {
  // Manage cursor - show it on main menu, and hide during game, depending on game settings
  if (!gameOver && !gameBeginning) {
    if (!Koji.config.strings.enableCursor) {
      noCursor()
    }
  } else {
    cursor(ARROW)
  }

  // Draw background or a solid color
  if (imgBackground) {
    background(imgBackground)
  } else {
    background(Koji.config.colors.backgroundColor)
  }

  // Draw UI
  if (gameOver || gameBeginning) {
    gameBeginningOver()
  } else {
    gamePlay()
  }

  soundButton.render()
}

/**
 * Go through objects and see which ones need to be removed
 * A good practive would be for objects to have a boolean like removable, and here you would go through all objects and remove them if they have removable = true;
 */
function cleanup() {
  for (let i = 0; i < floatingTexts.length; i += 1) {
    if (floatingTexts[i].timer <= 0) {
      floatingTexts.splice(i, 1)
    }
  }

  for (let i = 0; i < balloons.length; i += 1) {
    if (balloons[i] && balloons[i].wentOutOfFrame()) {
      balloons[i].destruct()
      balloons.splice(i, 1)
    }
  }

  // the `shootingBalloons` array is cleaned in the game.js file itself
}

// Call this when a lose life event should trigger
function loseLife() {
  // eslint-disable-next-line no-plusplus
  lives--

  if (lives <= 0) {
    // checkHighscore() // With the new leaderboard feature, we don't save the highscore anymore
    if (score > 300) openSetScoreWindow(score)
    gameOver = true
  }
}

// Handle input
function touchStarted() {
  if (gameOver || gameBeginning) {
  }

  if (soundButton.checkClick()) {
    toggleSound()
    return
  }

  if (!gameOver && !gameBeginning) {
    touching = true

    if (canEnd) {
      gameOver = true
      if (score > 300) openSetScoreWindow(score)
    }
  }
}

function touchEnded() {
  // This is required to fix a problem where the music sometimes doesn't start on mobile
  if (soundEnabled) {
    if (getAudioContext().state !== 'running') {
      getAudioContext().resume()
    }
  }

  touching = false

  if (!shootingBalloon.shooting && isMobile) shooter.shoot() // shoot when touch ended on mobile
}

// Key pressed and released
function keyPressed() {
  if (!gameOver && !gameBeginning) {
    // InGame
  }
}

function keyReleased() {
  if (!gameOver && !gameBeginning) {
    if (key === ' ' || keyCode === ENTER || keyCode === UP_ARROW) {
      if (!shootingBalloon.shooting) shooter.shoot() // shoot by keys on desktop
    }
  }
}

// Mouse Clicked
function mouseClicked() {
  if (!gameOver && !gameBeginning) {
    if (!shootingBalloon.shooting && !isMobile) shooter.shoot() // shoot by mouse click on desktop
  }
}

/**
 * Call this every time you want to start or reset the game
 * This is a good place to clear all arrays like enemies, bullets etc before starting a new game
 */
function init() {
  gameOver = false
  canEnd = false

  lives = startingLives
  highscoreGained = false
  score = 0

  floatingTexts = []
  particles = []

  gameTimer = startingGameTimer
  gameOverRectangleHeight = 0

  // before game gets over, remove all balloons and spawn them again
  balloons = []
  spawnBalloons()

  canScore = false

  // set score to zero if score increases mistakenly
  setTimeout(() => {
    score = 0
  }, 100)
}
