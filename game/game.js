var config = {
    type: Phaser.AUTO,
    width: 1100,
    height: 1050,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var currentFruit;
var canMoveFruit = true;
var fruitDelay = 1000;
var fruits = [];
var fruitRadius = 15;
var leftWall, rightWall;
var nextFruitKey;
var score = 0;
var scoreText;
var nextFruitDisplay, nextFruitLabel;
var friction = 1.0; // 摩擦係数の初期値
var restitution = 0.01; // 反発係数の初期値
var gameOver = false; // ゲームオーバーフラグ
var gameOverY = 100; // ゲームオーバーとするY軸の高さ
var gameOverImage;
var scoreDisplay;
var retryButton;
var twitterButton;

function preload() {
    this.load.image('fruit1', './img/fruit_01.png', { antialias: true });
    this.load.image('fruit2', './img/fruit_02.png', { antialias: true });
    this.load.image('fruit3', './img/fruit_03.png', { antialias: true });
    this.load.image('fruit4', './img/fruit_04.png', { antialias: true });
    this.load.image('fruit5', './img/fruit_05.png', { antialias: true });
    this.load.image('fruit6', './img/fruit_06.png', { antialias: true });
    this.load.image('fruit7', './img/fruit_07.png', { antialias: true });
    this.load.image('fruit8', './img/fruit_08.png', { antialias: true });
    this.load.image('fruit9', './img/fruit_09.png', { antialias: true });
    this.load.image('fruit10', './img/fruit_10.png', { antialias: true });
    this.load.image('fruit11', './img/fruit_11.png', { antialias: true });
    this.load.image('invisibleWall', './img/invisible_wall.png');
    this.load.image('gameOver', './img/game_over.png');
    this.load.image('gameOverLine', './img/game_over_line.png');
    this.load.image('retryButton', './img/retry_button.png');
    this.load.image('twitterButton', './img/twitter_button.png');
    this.load.image('background', './img/background.png');
}

var fruitScaleRatios = {
    'fruit1': 0.1,
    'fruit2': 0.15,
    'fruit3': 0.2,
    'fruit4': 0.25,
    'fruit5': 0.3,
    'fruit6': 0.35,
    'fruit7': 0.4,
    'fruit8': 0.45,
    'fruit9': 0.5,
    'fruit10': 0.55,
    'fruit11': 0.6
};

function getScoreValue(fruitKey) {
    var scoreValues = {
        'fruit1': 120,
        'fruit2': 20,
        'fruit3': 30,
        'fruit4': 40,
        'fruit5': 50,
        'fruit6': 60,
        'fruit7': 70,
        'fruit8': 80,
        'fruit9': 90,
        'fruit10': 100,
        'fruit11': 110
    };
    return scoreValues[fruitKey] || 0;
}


var selectableFruits = ['fruit1', 'fruit2', 'fruit3'];

function create() {
    this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(this.game.config.width, this.game.config.height);
    var gameOverLine = this.add.image(this.game.config.width / 2, gameOverY - 10, 'gameOverLine');
    gameOverLine.setScale(700 / gameOverLine.width, 20 / gameOverLine.height);
    leftWall = this.matter.add.image(200, this.game.config.height / 2, 'invisibleWall', null, { isStatic: true }).setScale(1, this.game.config.height);
    rightWall = this.matter.add.image(900, this.game.config.height / 2, 'invisibleWall', null, { isStatic: true }).setScale(1, this.game.config.height);

    var floor = this.matter.add.image(this.game.config.width / 2, this.game.config.height, 'invisibleWall', null, { isStatic: true });
    floor.setScale(this.game.config.width / floor.width, 0.5);
    floor.setPosition(this.game.config.width / 2, this.game.config.height - 150);

    scoreText = this.add.text(10, 10, 'Score: \n   0', {
        fontSize: '32px',
        fill: '#ffffff',
        align: 'right'
    });

    nextFruitLabel = this.add.text(940, 10, 'NEXT:', { fontSize: '32px', fill: '#ffffff', align: 'left' });
    setNextFruit();
    nextFruitDisplay = this.add.sprite(1010, 100, nextFruitKey).setScale(fruitScaleRatios[nextFruitKey]);

    this.input.on('pointerdown', function () {
        if (canMoveFruit) {
            canMoveFruit = false;
            currentFruit.setIgnoreGravity(false);
            setTimeout(() => {
                createNewFruit.call(this);
            }, fruitDelay);
        }
    }, this);

    this.matter.world.on('collisionstart', function (event) {
        for (var i = 0; i < event.pairs.length; i++) {
            var bodyA = event.pairs[i].bodyA;
            var bodyB = event.pairs[i].bodyB;

            if (isSameFruitCollision(bodyA, bodyB)) {
                var nextFruitKey = getNextFruitKey(bodyA.gameObject.texture.key);
                updateScore(getScoreValue(nextFruitKey));
                bodyA.gameObject.destroy();
                bodyB.gameObject.destroy();

                var collisionX = (bodyA.position.x + bodyB.position.x) / 2;
                var collisionY = (bodyA.position.y + bodyB.position.y) / 2;
                createNewFruitAtPosition.call(this, collisionX, collisionY, nextFruitKey);
            }
        }
    }, this);

    // ゲーム開始時のフルーツ生成
    createNewFruit.call(this);
}

function update() {
    if (gameOver) return; // ゲームオーバーなら何もしない
    if (canMoveFruit) {
        var minX = leftWall.x + leftWall.width / 2 + currentFruit.radius;
        var maxX = rightWall.x - rightWall.width / 2 - currentFruit.radius;
        var clampedX = Phaser.Math.Clamp(this.input.x, minX, maxX);
        currentFruit.setPosition(clampedX, 100);
    }
}

function checkGameOver() {
    for (var i = 0; i < fruits.length; i++) {
        var fruit = fruits[i];
        // オブジェクトが存在し、y プロパティがあることを確認
        if (fruit && fruit.body) {
            var fruitBottomY = fruit.body.position.y - fruit.radius;
            if (fruits[i] && fruits[i].body && fruitBottomY < gameOverY) {
                // ゲームオーバー処理
                this.matter.world.enabled = false; // 物理エンジンを停止
                gameOver = true;
                displayGameOverScreen.call(this);
                return;
            }
        }
    }
}

function displayGameOverScreen() {
    // ゲームオーバー画像を画面全体に表示
    gameOverImage = this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'gameOver');
    gameOverImage.setScale(this.game.config.width / gameOverImage.width, this.game.config.height / gameOverImage.height);

    // スコア表示を少し上に移動
    scoreDisplay = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 50, 'Score: ' + score, {
        fontSize: '32px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5);

    // ボタンのサイズと配置を計算
    var buttonWidth = this.game.config.width / 8;
    var buttonSpacing = 20; // ボタン間の余白

    // ボタンのX座標を計算
    var retryButtonX = this.game.config.width / 2 - buttonWidth / 2 - buttonSpacing / 2;
    var twitterButtonX = this.game.config.width / 2 + buttonWidth / 2 + buttonSpacing / 2;

    // 再挑戦ボタン
    retryButton = this.add.image(retryButtonX, this.game.config.height / 2 + 100, 'retryButton').setInteractive();
    retryButton.setScale(buttonWidth / retryButton.width);

    // Twitter共有ボタン
    twitterButton = this.add.image(twitterButtonX, this.game.config.height / 2 + 100, 'twitterButton').setInteractive();
    twitterButton.setScale(buttonWidth / twitterButton.width);

    // ボタンのイベントリスナーを設定
    retryButton.on('pointerdown', resetGame, this);
    twitterButton.on('pointerdown', function () {
        var tweetText = "My score: " + score + "! Can you beat me?";
        var tweetUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweetText);
        window.open(tweetUrl, '_blank');
    });
}

function resetGame() {
    // ゲームオーバー画面と関連要素の削除
    gameOverImage.destroy();
    scoreDisplay.destroy();
    retryButton.destroy();
    twitterButton.destroy();

    // ゲームのリセット
    score = 0;
    gameOver = false;
    fruits.forEach(function (fruit) {
        fruit.destroy();
    });
    fruits = [];
    this.matter.world.enabled = true;
    scoreText.setText('Score: \n   ' + score.toString().padStart(3, ' '));

    // ゲームの再開
    createNewFruit.call(this);
}

function setNextFruit() {
    nextFruitKey = Phaser.Math.RND.pick(selectableFruits);
    if (nextFruitDisplay) {
        nextFruitDisplay.setTexture(nextFruitKey);
        nextFruitDisplay.setScale(fruitScaleRatios[nextFruitKey]);
        nextFruitDisplay.x = 1010;
        nextFruitDisplay.y = 100;
    }
}

function createNewFruit() {
    // ゲームオーバーのチェック
    checkGameOver.call(this);
    if (gameOver) return; // ゲームオーバーなら新しいフルーツを生成しない

    // 新しいフルーツの生成
    canMoveFruit = true;
    var selectedFruit = nextFruitKey;
    var scaleRatio = fruitScaleRatios[selectedFruit];
    var initialX = Phaser.Math.Clamp(this.input.x, 200 + fruitRadius, 900 - fruitRadius);
    var initialY = 100;

    currentFruit = this.matter.add.sprite(initialX, initialY, selectedFruit).setScale(scaleRatio);
    var texture = this.textures.get(selectedFruit).getSourceImage();
    var radius = Math.min(texture.width, texture.height) / 2 * scaleRatio;
    currentFruit.setCircle(radius, { friction: 0.0, restitution: 0.6 });

    currentFruit.setIgnoreGravity(true);
    currentFruit.radius = radius;

    fruits.push(currentFruit);

    setNextFruit();
}

function getNextFruitKey(fruitKey) {
    var keys = Object.keys(fruitScaleRatios);
    var index = keys.indexOf(fruitKey);
    return keys[(index + 1) % keys.length];
}

function createNewFruitAtPosition(x, y, fruitKey) {
    var scaleRatio = fruitScaleRatios[fruitKey];

    var newFruit = this.matter.add.sprite(x, y, fruitKey).setScale(scaleRatio);
    var texture = this.textures.get(fruitKey).getSourceImage();
    var radius = Math.min(texture.width, texture.height) / 2 * scaleRatio;
    newFruit.setCircle(radius, { friction: 0.0, restitution: 0.6 });

    newFruit.setIgnoreGravity(false);
    newFruit.radius = radius;

    fruits.push(newFruit);
}

function isSameFruitCollision(bodyA, bodyB) {
    if (!fruits.includes(bodyA.gameObject) || !fruits.includes(bodyB.gameObject)) {
        return false;
    }
    return bodyA.gameObject.texture.key === bodyB.gameObject.texture.key;
}

function updateScore(increasedScore) {
    score += increasedScore;
    scoreText.setText('Score: \n   ' + score.toString().padStart(3, ' '));
}
