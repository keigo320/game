// =========================================================================
// Firebaseの設定
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyC22VUezuYsRIgz75o9Gw6GpKaKRtfBH-o",
    authDomain: "goggle-account-d0f3a.firebaseapp.com",
    projectId: "goggle-account-d0f3a",
    storageBucket: "goggle-account-d0f3a.firebasestorage.app",
    messagingSenderId: "1037977005352",
    appId: "1:1037977005352:web:ec0809057863d2093d341d",
    measurementId: "G-V0BY1467W6"
};
firebase.initializeApp(firebaseConfig);

// =========================================================================
// デバイス判別（DOMContentLoadedより前に実行）
// =========================================================================
const isMobile = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

// =========================================================================
// DOMContentLoadedイベントリスナー
// HTMLが完全に読み込まれてからJavaScriptを実行
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded. Starting initialization.");

    // =========================================================================
    // 変数宣言とDOM要素の取得
    // ここで全てのDOM要素を取得する
    // =========================================================================
    let gameState = 'home';
    let playerCoins = 0;
    let ownedGuns = ['handgun'];
    let bullets = [];
    let currentGun = null;
    let lastShotTime = 0;
    const recoilRecovery = 0.9;
    let currentRecoil = 0;
    let isReloading = false;
    let velocityY = 0;
    let isGrounded = true;
    const gravity = 0.005;
    const jumpPower = 0.1;
    const headbobFrequency = 10;
    const headbobAmplitude = 0.03;
    let time = 0;
    let cameraHorizontalRotation = 0;
    let cameraVerticalRotation = 0;
    const keyboard = {};
    const walkSpeed = 0.05;
    const runSpeed = 0.1;
    const enemies = [];
    const numEnemies = 50;
    const numBoxes = 200;

    // 視点切り替え用の変数
    let cameraMode = 'firstPerson';
    const firstPersonOffset = new THREE.Vector3(0, 0, 0);
    const thirdPersonOffset = new THREE.Vector3(0, 2, 5);

    // UI要素の取得
    const uiContainer = document.getElementById('ui-container');
    const gameContainer = document.getElementById('game-container');
    const homeScreen = document.getElementById('home-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const shopScreen = document.getElementById('shop-screen');
    const helpScreen = document.getElementById('help-screen');
    
    // ボタン要素の取得
    const startGameButton = document.getElementById('start-game-button');
    const showShopButton = document.getElementById('show-shop-button');
    const showSettingsButton = document.getElementById('show-settings-button');
    const showHelpButton = document.getElementById('show-help-button');
    const backFromShopButton = document.getElementById('back-from-shop-button');
    const backFromSettingsButton = document.getElementById('back-from-settings-button');
    const backFromHelpButton = document.getElementById('back-from-help-button');
    const presetHighButton = document.getElementById('preset-high-button');
    const presetLowButton = document.getElementById('preset-low-button');
    const forceStartButton = document.getElementById('force-start-button');
    
    // HUD要素の取得
    const homeCoinDisplay = document.getElementById('home-coin-display');
    const shopCoinDisplay = document.getElementById('shop-coin-display');
    const shopItemsContainer = document.getElementById('shop-items-container');
    const coinCounter = document.getElementById('coin-counter');
    const gunInfoPanel = document.getElementById('gun-info');
    const shootSound = document.getElementById('shoot-sound');
    const reloadSound = document.getElementById('reload-sound');
    const shootButton = document.getElementById('shoot-button');
    const jumpButton = document.getElementById('jump-button');
    const reloadButton = document.getElementById('reload-button');
    const debugInfoDiv = document.getElementById('debug-info');
    const axisHelperDiv = document.getElementById('axis-helper');
    const statusDiv = document.getElementById('status');
    const crosshairDiv = document.getElementById('crosshair');
    const debugMessageDiv = document.getElementById('debug-message');

    const mobileTopButtons = document.querySelector('.mobile-top-buttons');
    const switchGunButton = document.getElementById('switch-gun-button');
    const toggleViewButton = document.getElementById('toggle-view-button');
    const pauseButton = document.getElementById('pause-button');
    
    // Firebase関連のUI要素
    const authButton = document.getElementById('auth-button');
    const userInfoDiv = document.getElementById('user-info');

    // Firebase初期化
    const auth = firebase.auth();
    const database = firebase.database();
    const provider = new firebase.auth.GoogleAuthProvider();

    // 設定をプリセットから取得
    const presets = {
        high: {
            quality: 'high',
            fps: 120,
            drawDistance: 500,
            fov: 75,
            sensitivity: 0.5
        },
        low: {
            quality: 'low',
            fps: 60,
            drawDistance: 100,
            fov: 90,
            sensitivity: 0.8
        }
    };
    let currentPreset = presets.high;

    // シーン、カメラ、レンダラーのセットアップ
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(currentPreset.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(currentPreset.quality === 'high' ? window.devicePixelRatio : 0.5);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    gameContainer.appendChild(renderer.domElement);
    console.log("Three.js setup complete.");

    // プレイヤーモデルを作成
    const playerGroup = new THREE.Group();
    const playerBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    playerBody.position.y = 0.6;
    const playerHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    playerHead.position.y = 1.4;
    const playerRightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.8, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    playerRightArm.position.set(0.35, 0.8, 0);
    const playerLeftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.8, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    playerLeftArm.position.set(-0.35, 0.8, 0);
    const playerLegs = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.8, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    playerLegs.position.y = 0.4;

    playerGroup.add(playerBody, playerHead, playerRightArm, playerLeftArm, playerLegs);
    playerGroup.castShadow = true;
    playerGroup.receiveShadow = true;
    playerGroup.add(camera);
    scene.add(playerGroup);

    if (isMobile) {
        document.querySelectorAll('.virtual-buttons').forEach(el => {
            el.style.display = 'flex';
        });
        document.getElementById('joystick-area').style.display = 'block';
        mobileTopButtons.style.display = 'flex';
    }

    // =========================================================================
    // 銃の管理とデータ
    // =========================================================================
    const guns = {
        handgun: {
            model: null,
            geometry: { body: new THREE.BoxGeometry(0.1, 0.1, 0.4), magazine: new THREE.BoxGeometry(0.05, 0.2, 0.1) },
            material: { body: new THREE.MeshBasicMaterial({ color: 0x666666 }), magazine: new THREE.MeshBasicMaterial({ color: 0x444444 }) },
            position: new THREE.Vector3(0.2, -0.2, -0.5),
            magazineOffset: new THREE.Vector3(0, -0.15, -0.1),
            fireRate: 200,
            recoil: 0.05,
            name: "Energy Pistol",
            price: 0,
            ammo: 10,
            maxAmmo: 10,
            reloadTime: 1000
        },
        machinegun: {
            model: null,
            geometry: { body: new THREE.BoxGeometry(0.15, 0.1, 0.6), magazine: new THREE.BoxGeometry(0.07, 0.25, 0.15) },
            material: { body: new THREE.MeshBasicMaterial({ color: 0x333333 }), magazine: new THREE.MeshBasicMaterial({ color: 0x222222 }) },
            position: new THREE.Vector3(0.3, -0.3, -0.6),
            magazineOffset: new THREE.Vector3(0, -0.2, -0.2),
            fireRate: 80,
            recoil: 0.03,
            name: "Plasma Blaster",
            price: 50,
            ammo: 30,
            maxAmmo: 30,
            reloadTime: 2000
        }
    };

    let currentGunIndex = 0;

    // =========================================================================
    // 関数定義
    // =========================================================================

    // =========================================================================
    // セーブ・ロード機能
    // =========================================================================
    function saveGame() {
        const gameStateData = {
            coins: playerCoins,
            ownedGuns: ownedGuns
        };
        try {
            localStorage.setItem('survivalShooterSave', JSON.stringify(gameStateData));
            console.log('ゲームをローカルに保存しました');
        } catch (e) {
            console.error('ゲームのローカル保存に失敗しました:', e);
        }
    }

    function loadGame() {
        try {
            const savedData = localStorage.getItem('survivalShooterSave');
            if (savedData) {
                const gameStateData = JSON.parse(savedData);
                playerCoins = gameStateData.coins || 0;
                ownedGuns = gameStateData.ownedGuns || ['handgun'];
                console.log('ゲームをローカルからロードしました');
            }
        } catch (e) {
            console.error('ゲームのローカルロードに失敗しました:', e);
        }
    }
    
    // Firebase用セーブ・ロード関数
    function saveUserData(uid) {
        const userData = {
            coins: playerCoins,
            ownedGuns: ownedGuns
        };
        database.ref(`users/${uid}/data`).set(userData).then(() => {
            console.log('ユーザーデータをFirebaseに保存しました');
        }).catch((error) => {
            console.error('Firebaseへのデータ保存に失敗しました:', error);
        });
    }

    function loadUserData(uid) {
        database.ref(`users/${uid}/data`).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                playerCoins = data.coins || 0;
                ownedGuns = data.ownedGuns || ['handgun'];
                console.log('ユーザーデータをFirebaseからロードしました');
            } else {
                console.log('新規ユーザーです。初期データを設定します');
                playerCoins = 0;
                ownedGuns = ['handgun'];
                saveUserData(uid);
            }
            updateCoinDisplays();
            switchGun('handgun');
        }).catch((error) => {
            console.error('Firebaseからのデータロードに失敗しました:', error);
            debugMessageDiv.textContent = 'エラー: Firebaseからデータをロードできませんでした。';
        });
    }

    // 保存・読み込み関数をログイン状態に応じて切り替える
    const originalSaveGame = saveGame;
    const originalLoadGame = loadGame;

    saveGame = () => {
        if (auth.currentUser) {
            saveUserData(auth.currentUser.uid);
        } else {
            originalSaveGame();
        }
    };

    loadGame = () => {
        if (auth.currentUser) {
            loadUserData(auth.currentUser.uid);
        } else {
            originalLoadGame();
        }
    };

    function updateGunInfo() {
        if (!currentGun) return;
        gunInfoPanel.innerHTML = `
            <div class="current-gun">${currentGun.name}</div>
            <div class="ammo">${currentGun.ammo} / ${currentGun.maxAmmo}</div>
            <div class="ammo">${isReloading ? "Reloading..." : ""}</div>
        `;
    }

    function createGunModel(gunData) {
        const gunGroup = new THREE.Group();
        const gunBodyMesh = new THREE.Mesh(gunData.geometry.body, gunData.material.body);
        gunBodyMesh.castShadow = true;
        gunGroup.add(gunBodyMesh);
        const magazineMesh = new THREE.Mesh(gunData.geometry.magazine, gunData.material.magazine);
        magazineMesh.position.copy(gunData.magazineOffset);
        magazineMesh.name = 'magazine';
        magazineMesh.castShadow = true;
        gunGroup.add(magazineMesh);
        gunGroup.position.copy(gunData.position);
        gunGroup.name = 'gunModel';
        return gunGroup;
    }

    function switchGun(gunName) {
        if (!ownedGuns.includes(gunName)) {
            console.log("この銃は所有していません！");
            return;
        }
        if (currentGun && currentGun.model) {
            if (camera.children.includes(currentGun.model)) {
                camera.remove(currentGun.model);
            } else if (playerRightArm.children.includes(currentGun.model)) {
                playerRightArm.remove(currentGun.model);
            }
        }
        displayNewGun(gunName);
    }

    function displayNewGun(gunName) {
        const newGunData = guns[gunName];
        if (!newGunData) return;

        if (!newGunData.model) {
            newGunData.model = createGunModel(newGunData);
        }
        currentGun = newGunData;

        if (cameraMode === 'firstPerson') {
            camera.add(currentGun.model);
            currentGun.model.position.copy(currentGun.position);
            currentGun.model.rotation.set(0, 0, 0);
        } else {
            playerRightArm.add(currentGun.model);
            currentGun.model.position.set(0, -0.2, 0.2);
            currentGun.model.rotation.set(0, -Math.PI / 2, Math.PI / 2);
        }

        const targetPosition = currentGun.model.position.clone();
        currentGun.model.position.y -= 0.5;
        currentGun.model.traverse((obj) => {
            if (obj.isMesh) {
                obj.material.opacity = 0;
                obj.material.transparent = true;
            }
        });

        const animationDuration = 150;
        let startTime = null;
        function animateAddition(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            currentGun.model.position.y = targetPosition.y - (0.5 * (1 - progress));
            currentGun.model.traverse((obj) => {
                if (obj.isMesh) {
                    obj.material.opacity = progress;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animateAddition);
            } else {
                currentGun.model.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.material.transparent = false;
                    }
                });
            }
        }
        requestAnimationFrame(animateAddition);
        updateGunInfo();
    }

    function switchNextGun() {
        const nextIndex = (currentGunIndex + 1) % ownedGuns.length;
        const nextGunName = ownedGuns[nextIndex];
        switchGun(nextGunName);
        currentGunIndex = nextIndex;
    }

    function reload() {
        if (isReloading || currentGun.ammo === currentGun.maxAmmo) {
            return;
        }
        isReloading = true;
        playSound(reloadSound);
        updateGunInfo();
        const magazine = currentGun.model.getObjectByName('magazine');
        if (magazine) {
            const originalMagY = currentGun.magazineOffset.y;
            const reloadTimeline = gsap.timeline({
                onComplete: () => {
                    currentGun.ammo = currentGun.maxAmmo;
                    isReloading = false;
                    updateGunInfo();
                }
            });
            reloadTimeline.to(magazine.position, {
                y: originalMagY - 0.3,
                duration: currentGun.reloadTime * 0.3 / 1000,
                ease: "power2.in"
            });
            reloadTimeline.to(magazine.position, {
                y: originalMagY,
                duration: currentGun.reloadTime * 0.5 / 1000,
                ease: "power2.out"
            }, `+=${currentGun.reloadTime * 0.1 / 1000}`);
        } else {
            setTimeout(() => {
                currentGun.ammo = currentGun.maxAmmo;
                isReloading = false;
                updateGunInfo();
            }, currentGun.reloadTime);
        }
    }

    function shoot() {
        if (isReloading || currentGun.ammo <= 0) {
            return;
        }
        const now = Date.now();
        if (now - lastShotTime < currentGun.fireRate) {
            return;
        }
        lastShotTime = now;
        currentGun.ammo--;
        updateGunInfo();
        playSound(shootSound);
        currentRecoil = -currentGun.recoil;
        const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        const gunWorldPosition = new THREE.Vector3();
        const bulletDirection = new THREE.Vector3();

        if (cameraMode === 'firstPerson') {
            currentGun.model.getWorldPosition(gunWorldPosition);
            camera.getWorldDirection(bulletDirection);
        } else {
            currentGun.model.getWorldPosition(gunWorldPosition);
            camera.getWorldDirection(bulletDirection);
        }

        bullet.position.copy(gunWorldPosition);
        bullet.userData.direction = bulletDirection.clone();
        bullet.userData.speed = 1.5;
        bullet.userData.life = 0;
        bullet.userData.maxLife = 120;
        scene.add(bullet);
        bullets.push(bullet);
    }

    function jump() {
        if (isGrounded) {
            velocityY = jumpPower;
            isGrounded = false;
            gsap.to(camera.position, {
                y: cameraHeight + 0.3,
                duration: 0.2,
                yoyo: true,
                repeat: 1,
                ease: "power1.out"
            });
        }
    }

    // ゲームを一時停止し、指定された画面を表示する関数
    function pauseGameAndShowScreen(screen) {
        if (document.pointerLockElement === gameContainer) {
            document.exitPointerLock();
        }
        homeScreen.style.display = 'none';
        settingsScreen.style.display = 'none';
        shopScreen.style.display = 'none';
        helpScreen.style.display = 'none';
        uiContainer.style.display = 'flex';
        gameContainer.style.display = 'none';
        gunInfoPanel.style.display = 'none';
        crosshairDiv.style.display = 'none';
        if (isMobile) {
            mobileTopButtons.style.display = 'none';
            document.querySelectorAll('.virtual-buttons').forEach(el => el.style.display = 'none');
            document.getElementById('joystick-area').style.display = 'none';
        }
        screen.style.display = 'flex';
        gameState = screen.id.split('-')[0];
    }

    function resumeGame() {
        if (isMobile) {
            gameState = 'playing';
            uiContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            gunInfoPanel.style.display = 'block';
            crosshairDiv.style.display = 'block';
            updateGunInfo();
            mobileTopButtons.style.display = 'flex';
            document.querySelectorAll('.virtual-buttons').forEach(el => el.style.display = 'flex');
            document.getElementById('joystick-area').style.display = 'block';
        } else {
            // PCの場合、マウスロックを要求する
            gameContainer.requestPointerLock();
        }
    }

    function updateCoinDisplays() {
        homeCoinDisplay.textContent = playerCoins;
        shopCoinDisplay.textContent = playerCoins;
        coinCounter.textContent = `Credits: ${playerCoins}`;
    }

    function populateShop() {
        shopItemsContainer.innerHTML = '';
        const gunsForSale = Object.keys(guns).filter(gunName => gunName !== 'handgun');
        gunsForSale.forEach(gunName => {
            const gun = guns[gunName];
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('shop-item');
            const statusText = ownedGuns.includes(gunName) ? `<span class="owned">所有済み</span>` : `<span class="price">${gun.price} CR</span>`;
            itemDiv.innerHTML = `
                <span>${gun.name}</span>
                <span>${statusText}</span>
            `;
            if (!ownedGuns.includes(gunName)) {
                const buyButton = document.createElement('button');
                buyButton.textContent = '購入';
                buyButton.disabled = playerCoins < gun.price;
                buyButton.classList.add(buyButton.disabled ? 'disabled' : '');
                buyButton.addEventListener('click', () => {
                    buyGun(gunName);
                });
                itemDiv.appendChild(buyButton);
            }
            shopItemsContainer.appendChild(itemDiv);
        });
    }

    function buyGun(gunName) {
        const gun = guns[gunName];
        if (playerCoins >= gun.price) {
            playerCoins -= gun.price;
            ownedGuns.push(gunName);
            saveGame(); // ゲームを保存
            updateCoinDisplays();
            populateShop();
        }
    }

    function createSFEnemy() {
        const enemyGroup = new THREE.Group();
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        enemyGroup.add(body);
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        enemyGroup.add(head);
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.5, 0.25);
        enemyGroup.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.5, 0.25);
        enemyGroup.add(rightEye);
        enemyGroup.userData.isEnemy = true;
        return enemyGroup;
    }

    let showDebugInfo = false;
    let axisRenderer, axisScene, axisCamera;

    function setupAxisHelper() {
        if (axisHelperDiv.children.length > 0) return;
        axisRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        axisRenderer.setSize(100, 100);
        axisHelperDiv.appendChild(axisRenderer.domElement);
        axisScene = new THREE.Scene();
        axisCamera = new THREE.PerspectiveCamera(50, 1, 1, 100);
        axisCamera.up = new THREE.Vector3(0, 1, 0);
        axisCamera.position.z = 5;
        const axesHelper = new THREE.AxesHelper(3);
        axesHelper.setColors(0xff0000, 0x00ff00, 0x0000ff);
        axisScene.add(axesHelper);
        const gridHelper = new THREE.GridHelper(2, 2, 0x888888, 0x444444);
        gridHelper.position.y = -1.5;
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
        axisScene.add(gridHelper);
    }

    function updateAxisHelper() {
        if (axisRenderer && showDebugInfo) {
            axisCamera.rotation.copy(camera.rotation);
            axisCamera.position.copy(camera.position);
            axisCamera.position.y = 0;
            axisRenderer.render(axisScene, axisCamera);
        }
    }

    let lastTime = 0;
    let frameCount = 0;
    let fpsValue = 0;
    const cameraHeight = 1.6;

    // AABB (Axis-Aligned Bounding Box) の当たり判定
    function checkCollision(player, obstacles) {
        const playerBox = new THREE.Box3().setFromObject(player);
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (playerBox.intersectsBox(obstacleBox)) {
                return true;
            }
        }
        return false;
    }

    function checkLanding(player, obstacles) {
        const playerBox = new THREE.Box3().setFromObject(player);
        const landingCheckPoint = playerBox.min.clone();
        landingCheckPoint.y -= 0.1;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (obstacleBox.containsPoint(landingCheckPoint)) {
                return obstacle;
            }
        }
        return null;
    }

    function updatePhysicsAndMovement() {
        const isMoving = keyboard['w'] || keyboard['s'] || keyboard['a'] || keyboard['d'];
        const currentMoveSpeed = keyboard['shift'] ? runSpeed : walkSpeed;
        const previousPosition = playerGroup.position.clone();

        const moveVector = new THREE.Vector3();
        const direction = new THREE.Vector3();
        playerGroup.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3().crossVectors(direction, playerGroup.up);
        right.y = 0;
        right.normalize();

        if (keyboard['w']) moveVector.add(direction);
        if (keyboard['s']) moveVector.sub(direction);
        if (keyboard['a']) moveVector.sub(right);
        if (keyboard['d']) moveVector.add(right);

        moveVector.normalize().multiplyScalar(currentMoveSpeed);
        playerGroup.position.add(moveVector);

        if (checkCollision(playerGroup, scene.children.filter(o => o.userData.isObstacle))) {
            playerGroup.position.copy(previousPosition);
        }

        const landingObject = checkLanding(playerGroup, scene.children.filter(o => o.userData.isObstacle));
        if (!isGrounded) {
            velocityY -= gravity;
            playerGroup.position.y += velocityY;
        }

        const currentStandingHeight = playerGroup.position.y;
        if (landingObject) {
            const obstacleHeight = landingObject.position.y + landingObject.geometry.parameters.height / 2;
            if (currentStandingHeight <= obstacleHeight + 0.8) {
                playerGroup.position.y = obstacleHeight + 0.8;
                isGrounded = true;
                velocityY = 0;
            } else if (currentStandingHeight > cameraHeight) {
                isGrounded = false;
            }
        } else if (currentStandingHeight <= cameraHeight) {
            playerGroup.position.y = cameraHeight;
            isGrounded = true;
            velocityY = 0;
        } else {
            isGrounded = false;
        }

        if (isMoving && isGrounded) {
            time += 1;
            const bobOffsetX = Math.sin(time / (headbobFrequency * 0.5)) * headbobAmplitude * 0.5;
            const bobOffsetY = Math.sin(time / headbobFrequency) * headbobAmplitude;
            camera.position.set(bobOffsetX, cameraHeight + bobOffsetY, 0);
            if (cameraMode === 'thirdPerson') {
                camera.position.y += 2;
                camera.position.z += 5;
            }
        } else if (isGrounded) {
            time = 0;
            camera.position.set(0, cameraHeight, 0);
            if (cameraMode === 'thirdPerson') {
                camera.position.y += 2;
                camera.position.z += 5;
            }
        }
    }

    // =========================================================================
    // 描画ループ (animate)
    // =========================================================================
    const animate = (currentTime) => {
        const frameTime = 1000 / currentPreset.fps;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, frameTime - (currentTime % frameTime));

        if (gameState !== 'playing') {
            renderer.render(scene, camera);
            return;
        }

        frameCount++;
        if (currentTime > lastTime + 1000) {
            fpsValue = Math.round(frameCount * 1000 / (currentTime - lastTime));
            statusDiv.textContent = `FPS: ${fpsValue}`;
            frameCount = 0;
            lastTime = currentTime;
        }

        if (showDebugInfo) {
            debugInfoDiv.style.display = 'block';
            axisHelperDiv.style.display = 'block';
            debugInfoDiv.innerHTML = `
                FPS: ${fpsValue}<br>
                Player X: ${playerGroup.position.x.toFixed(2)}<br>
                Player Y: ${playerGroup.position.y.toFixed(2)}<br>
                Player Z: ${playerGroup.position.z.toFixed(2)}<br>
                Camera H. Rotation: ${THREE.MathUtils.radToDeg(cameraHorizontalRotation).toFixed(2)}<br>
                Camera V. Rotation: ${THREE.MathUtils.radToDeg(cameraVerticalRotation).toFixed(2)}
            `;
            updateAxisHelper();
        } else {
            debugInfoDiv.style.display = 'none';
            axisHelperDiv.style.display = 'none';
        }

        playerGroup.rotation.y = cameraHorizontalRotation;
        camera.rotation.x = cameraVerticalRotation;

        if (cameraMode === 'firstPerson') {
            camera.position.copy(firstPersonOffset);
            playerGroup.children.forEach(c => c.visible = false);
            const gunModel = playerGroup.getObjectByName('gunModel');
            if (gunModel) playerGroup.remove(gunModel);
            if (currentGun && currentGun.model && !camera.children.includes(currentGun.model)) {
                camera.add(currentGun.model);
                currentGun.model.position.copy(currentGun.position);
                currentGun.model.rotation.set(0, 0, 0);
            }
        } else {
            camera.position.copy(thirdPersonOffset);
            playerGroup.children.forEach(c => c.visible = true);
            const gunModel = camera.getObjectByName('gunModel');
            if (gunModel) camera.remove(gunModel);
            if (currentGun && currentGun.model && !playerRightArm.children.includes(currentGun.model)) {
                playerRightArm.add(currentGun.model);
                currentGun.model.position.set(0, -0.2, 0.2);
                currentGun.model.rotation.set(0, -Math.PI / 2, Math.PI / 2);
            }
        }

        updatePhysicsAndMovement();

        enemies.forEach(enemy => {
            const distanceToPlayer = enemy.position.distanceTo(playerGroup.position);
            const enemySpeed = 0.005;
            const stoppingDistance = 5;

            enemy.visible = distanceToPlayer <= currentPreset.drawDistance;

            if (distanceToPlayer > stoppingDistance) {
                const directionToPlayer = new THREE.Vector3();
                directionToPlayer.subVectors(playerGroup.position, enemy.position).normalize();
                enemy.position.add(directionToPlayer.multiplyScalar(enemySpeed));
            }
            enemy.lookAt(playerGroup.position.x, enemy.position.y, playerGroup.position.z);
        });

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.position.add(bullet.userData.direction.clone().multiplyScalar(bullet.userData.speed));
            bullet.userData.life++;
            let hitEnemy = null;
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                if (enemy.visible && bullet.position.distanceTo(enemy.position) < 1.0) {
                    hitEnemy = enemy;
                    break;
                }
            }
            if (hitEnemy) {
                scene.remove(hitEnemy);
                enemies.splice(enemies.indexOf(hitEnemy), 1);
                playerCoins += 10;
                saveGame(); // ゲームを保存
                updateCoinDisplays();
                const particleCount = 200;
                const particles = new THREE.BufferGeometry();
                const positions = [];
                const colors = [];
                for (let k = 0; k < particleCount; k++) {
                    positions.push(0, 0, 0);
                    colors.push(1, Math.random(), 0);
                }
                particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                const particleMaterial = new THREE.PointsMaterial({
                    size: 1,
                    vertexColors: true,
                    sizeAttenuation: true,
                    transparent: true,
                    opacity: 1
                });
                const particleSystem = new THREE.Points(particles, particleMaterial);
                particleSystem.position.copy(hitEnemy.position);
                scene.add(particleSystem);
                let particleVelocity = [];
                for (let k = 0; k < particleCount; k++) {
                    particleVelocity.push((Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5);
                }
                particleSystem.update = () => {
                    const positions = particleSystem.geometry.attributes.position.array;
                    for (let l = 0; l < positions.length; l += 3) {
                        positions[l] += particleVelocity[l];
                        positions[l + 1] += particleVelocity[l + 1];
                        positions[l + 2] += particleVelocity[l + 2];
                        particleVelocity[l + 1] -= 0.1;
                    }
                    particleSystem.geometry.attributes.position.needsUpdate = true;
                };
                setTimeout(() => {
                    scene.remove(particleSystem);
                    particleSystem.geometry.dispose();
                    particleSystem.material.dispose();
                }, 1000);
                scene.remove(bullet);
                bullets.splice(i, 1);
            } else if (bullet.userData.life > bullet.userData.maxLife) {
                scene.remove(bullet);
                bullets.splice(i, 1);
            }
        }
        scene.children.forEach(child => {
            if (child.update) {
                child.update();
            }
        });
        if (currentRecoil < 0) {
            camera.rotation.x += currentRecoil;
            currentRecoil *= recoilRecovery;
        }
        renderer.render(scene, camera);
    };

    // =========================================================================
    // イベントリスナーと初期化処理
    // =========================================================================
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === gameContainer) {
            console.log('マウスロックが有効になりました');
            gameState = 'playing';
            uiContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            gunInfoPanel.style.display = 'block';
            crosshairDiv.style.display = 'block';
            updateGunInfo();
        } else {
            console.log('マウスロックが無効になりました');
            pauseGameAndShowScreen(homeScreen);
            saveGame();
        }
    });

    document.addEventListener('pointerlockerror', () => {
        console.error('マウスロックの取得に失敗しました');
        debugMessageDiv.textContent = 'エラー: マウスロックに失敗しました。';
    });

    document.addEventListener('click', (event) => {
        if (gameState === 'playing' && document.pointerLockElement === gameContainer) {
            if (event.button === 0) {
                shoot();
            }
        }
    });
    document.addEventListener('mousedown', (event) => {
        if (gameState === 'playing' && document.pointerLockElement === gameContainer) {
            if (event.button === 0) {
                // 連続射撃の開始
            }
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (gameState === 'playing' && document.pointerLockElement === gameContainer) {
            if (event.button === 0) {
                // 連続射撃の停止
            }
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (gameState === 'playing' && document.pointerLockElement === gameContainer) {
            cameraHorizontalRotation -= event.movementX * 0.002 * currentPreset.sensitivity;
            cameraVerticalRotation -= event.movementY * 0.002 * currentPreset.sensitivity;
            cameraVerticalRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraVerticalRotation));
        }
    });

    document.addEventListener('keydown', (event) => {
        keyboard[event.key.toLowerCase()] = true;
        if (gameState === 'playing') {
            if (event.key.toLowerCase() === 'r') {
                reload();
            }
            if (event.key.toLowerCase() === 'v') {
                toggleView();
            }
            if (event.key === 'Escape') {
                pauseGameAndShowScreen(homeScreen);
            }
        }
    });

    document.addEventListener('keyup', (event) => {
        keyboard[event.key.toLowerCase()] = false;
    });

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    function playSound(sound) {
        if (sound && sound.readyState >= 2) {
            const clonedSound = sound.cloneNode();
            clonedSound.volume = 0.5;
            clonedSound.play().catch(e => console.error("音声再生に失敗しました:", e));
        }
    }

    function toggleView() {
        cameraMode = (cameraMode === 'firstPerson') ? 'thirdPerson' : 'firstPerson';
        switchGun(ownedGuns[currentGunIndex]);
    }

    function applyPreset(preset) {
        currentPreset = preset;
        camera.fov = currentPreset.fov;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(currentPreset.quality === 'high' ? window.devicePixelRatio : 0.5);
    }
    
    // =========================================================================
    // Firebase 認証イベントリスナー
    // =========================================================================
    auth.onAuthStateChanged(user => {
        if (user) {
            userInfoDiv.textContent = `ようこそ、${user.displayName}さん！`;
            authButton.textContent = "ログアウト";
            debugMessageDiv.textContent = "";
            console.log("Firebaseにログインしました:", user.uid);
            loadGame();
        } else {
            userInfoDiv.textContent = "";
            authButton.textContent = "Googleでログイン";
            console.log("Firebaseからログアウトしました");
            loadGame();
        }
    });
    
    // =========================================================================
    // UIボタンのイベントリスナー
    // =========================================================================
    authButton.addEventListener('click', () => {
        if (auth.currentUser) {
            auth.signOut().then(() => {
                console.log("ログアウト成功");
            }).catch((error) => {
                console.error("ログアウトエラー:", error);
                debugMessageDiv.textContent = 'エラー: ログアウトに失敗しました。';
            });
        } else {
            auth.signInWithPopup(provider).then((result) => {
                const user = result.user;
                console.log("ログイン成功:", user.uid);
            }).catch((error) => {
                console.error("ログインエラー:", error);
                debugMessageDiv.textContent = `エラー: ログインに失敗しました (${error.code})`;
            });
        }
    });

    startGameButton.addEventListener('click', () => {
        if (auth.currentUser) {
            resumeGame();
        } else {
            debugMessageDiv.textContent = 'ゲームを開始するには、Googleでログインしてください。';
        }
    });
    
    forceStartButton.addEventListener('click', () => {
        debugMessageDiv.textContent = 'デバッグモードでゲームを開始します...';
        resumeGame();
    });

    showShopButton.addEventListener('click', () => {
        pauseGameAndShowScreen(shopScreen);
        populateShop();
    });

    backFromShopButton.addEventListener('click', () => {
        pauseGameAndShowScreen(homeScreen);
    });

    showSettingsButton.addEventListener('click', () => {
        pauseGameAndShowScreen(settingsScreen);
    });

    backFromSettingsButton.addEventListener('click', () => {
        pauseGameAndShowScreen(homeScreen);
    });

    presetHighButton.addEventListener('click', () => {
        applyPreset(presets.high);
    });

    presetLowButton.addEventListener('click', () => {
        applyPreset(presets.low);
    });

    showHelpButton.addEventListener('click', () => {
        pauseGameAndShowScreen(helpScreen);
    });

    backFromHelpButton.addEventListener('click', () => {
        pauseGameAndShowScreen(homeScreen);
    });

    // モバイルボタンのイベントリスナー
    if (shootButton) {
        shootButton.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            shoot();
        });
    }

    if (reloadButton) {
        reloadButton.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            reload();
        });
    }

    if (jumpButton) {
        jumpButton.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            jump();
        });
    }

    if (switchGunButton) {
        switchGunButton.addEventListener('click', () => {
            switchNextGun();
        });
    }

    if (toggleViewButton) {
        toggleViewButton.addEventListener('click', () => {
            toggleView();
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            pauseGameAndShowScreen(homeScreen);
        });
    }


    // =========================================================================
    // ゲームオブジェクトの生成
    // =========================================================================
    console.log("Creating game objects...");

    // 床
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 照明
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // オブスタクル (箱)
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.5 });
    for (let i = 0; i < numBoxes; i++) {
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(
            (Math.random() - 0.5) * 80,
            1,
            (Math.random() - 0.5) * 80
        );
        box.rotation.y = Math.random() * Math.PI * 2;
        box.castShadow = true;
        box.receiveShadow = true;
        box.userData.isObstacle = true;
        scene.add(box);
    }

    // エネミーの生成
    for (let i = 0; i < numEnemies; i++) {
        const enemy = createSFEnemy();
        enemy.position.set(
            (Math.random() - 0.5) * 80,
            0,
            (Math.random() - 0.5) * 80
        );
        scene.add(enemy);
        enemies.push(enemy);
    }

    // プレイヤーの初期位置を設定
    playerGroup.position.y = cameraHeight;
    camera.position.set(0, cameraHeight, 0);

    // 初期化と描画ループの開始
    loadGame();
    updateCoinDisplays();
    switchGun('handgun');
    applyPreset(presets.high);
    setupAxisHelper();
    animate(performance.now());
});