/* ============================================================
   NEON STREET RACER
   Phase 1 - Browser 3D Racing Prototype

   Engine:
   Three.js

   Controls:
   W / Arrow Up    = Accelerate
   S / Arrow Down  = Brake / Reverse
   A / Arrow Left  = Left
   D / Arrow Right = Right
   SPACE           = Handbrake
   SHIFT           = Nitro
   R               = Reset
   ESC             = Pause
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const CONFIG = {

    car: {
        maxSpeed: 72,
        acceleration: 32,
        brakePower: 50,
        reverseSpeed: 22,

        steering: 2.2,

        grip: 7.5,

        driftGrip: 2.2,

        drag: 1.8
    },

    nitro: {
        max: 100,
        boostPower: 45,
        durationDrain: 22,
        recharge: 8
    },

    camera: {
        distance: 9,
        height: 4.2,
        smooth: 5
    },

    world: {
        roadWidth: 14,
        roadLength: 1000
    }

};


/* ============================================================
   THREE.JS VARIABLES
============================================================ */

let scene;
let camera;
let renderer;

let clock;

let playerCar;

let road;

let buildings = [];

let started = false;
let paused = false;
let countdownActive = false;

let raceTime = 0;

let nitro = CONFIG.nitro.max;


/* ============================================================
   INPUT
============================================================ */

const keys = {

    forward: false,
    backward: false,

    left: false,
    right: false,

    handbrake: false,
    nitro: false

};


window.addEventListener("keydown", (event) => {

    switch (event.code) {

        case "KeyW":
        case "ArrowUp":
            keys.forward = true;
            break;

        case "KeyS":
        case "ArrowDown":
            keys.backward = true;
            break;

        case "KeyA":
        case "ArrowLeft":
            keys.left = true;
            break;

        case "KeyD":
        case "ArrowRight":
            keys.right = true;
            break;

        case "Space":
            keys.handbrake = true;
            event.preventDefault();
            break;

        case "ShiftLeft":
        case "ShiftRight":
            keys.nitro = true;
            break;

        case "KeyR":
            resetCar();
            break;

        case "Escape":

            if (started) {

                if (paused) {
                    resumeGame();
                } else {
                    pauseGame();
                }

            }

            break;
    }

});


window.addEventListener("keyup", (event) => {

    switch (event.code) {

        case "KeyW":
        case "ArrowUp":
            keys.forward = false;
            break;

        case "KeyS":
        case "ArrowDown":
            keys.backward = false;
            break;

        case "KeyA":
        case "ArrowLeft":
            keys.left = false;
            break;

        case "KeyD":
        case "ArrowRight":
            keys.right = false;
            break;

        case "Space":
            keys.handbrake = false;
            break;

        case "ShiftLeft":
        case "ShiftRight":
            keys.nitro = false;
            break;

    }

});


/* ============================================================
   INITIALIZE GAME
============================================================ */

function init() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x050814);

    scene.fog = new THREE.FogExp2(
        0x050814,
        0.008
    );


    /* -------------------------
       CAMERA
    ------------------------- */

    camera = new THREE.PerspectiveCamera(

        65,

        window.innerWidth / window.innerHeight,

        0.1,

        2000

    );

    camera.position.set(
        0,
        CONFIG.camera.height,
        CONFIG.camera.distance
    );


    /* -------------------------
       RENDERER
    ------------------------- */

    renderer = new THREE.WebGLRenderer({

        antialias: true,

        powerPreference: "high-performance"

    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;


    document
        .getElementById("game-container")
        .appendChild(renderer.domElement);


    /* -------------------------
       LIGHTING
    ------------------------- */

    createLighting();


    /* -------------------------
       WORLD
    ------------------------- */

    createGround();

    createRoad();

    createRoadLines();

    createBuildings();

    createStreetLights();

    createFinishLine();


    /* -------------------------
       PLAYER
    ------------------------- */

    playerCar = createPlayerCar();

    scene.add(playerCar);


    /* -------------------------
       CLOCK
    ------------------------- */

    clock = new THREE.Clock();


    /* -------------------------
       RESIZE
    ------------------------- */

    window.addEventListener(
        "resize",
        onWindowResize
    );


    /* -------------------------
       START BUTTON
    ------------------------- */

    document
        .getElementById("start-btn")
        .addEventListener(
            "click",
            startGame
        );


    document
        .getElementById("resume-btn")
        .addEventListener(
            "click",
            resumeGame
        );


    document
        .getElementById("restart-btn")
        .addEventListener(
            "click",
            restartGame
        );


    /* -------------------------
       LOOP
    ------------------------- */

    animate();

}


/* ============================================================
   LIGHTING
============================================================ */

function createLighting() {

    /* Ambient */

    const ambient =
        new THREE.HemisphereLight(

            0x6688ff,

            0x080808,

            1.5

        );

    scene.add(ambient);


    /* Moon */

    const moon =
        new THREE.DirectionalLight(

            0x6688ff,

            2

        );

    moon.position.set(
        -100,
        150,
        100
    );

    moon.castShadow = true;

    scene.add(moon);


    /* Neon blue */

    const blueLight =
        new THREE.PointLight(

            0x00eaff,

            10,

            100

        );

    blueLight.position.set(
        0,
        8,
        0
    );

    scene.add(blueLight);

}


/* ============================================================
   GROUND
============================================================ */

function createGround() {

    const geometry =
        new THREE.PlaneGeometry(
            1000,
            2000
        );

    const material =
        new THREE.MeshStandardMaterial({

            color: 0x080b10,

            roughness: 0.9,

            metalness: 0.05

        });


    const ground =
        new THREE.Mesh(
            geometry,
            material
        );

    ground.rotation.x =
        -Math.PI / 2;

    ground.position.y = -0.15;

    ground.receiveShadow = true;

    scene.add(ground);

}


/* ============================================================
   ROAD
============================================================ */

function createRoad() {

    const geometry =
        new THREE.PlaneGeometry(

            CONFIG.world.roadWidth,

            CONFIG.world.roadLength

        );


    const material =
        new THREE.MeshStandardMaterial({

            color: 0x16191f,

            roughness: 0.75,

            metalness: 0.15

        });


    road =
        new THREE.Mesh(
            geometry,
            material
        );

    road.rotation.x =
        -Math.PI / 2;

    road.position.y = 0;

    road.receiveShadow = true;

    scene.add(road);

}


/* ============================================================
   ROAD MARKINGS
============================================================ */

function createRoadLines() {

    const lineMaterial =
        new THREE.MeshBasicMaterial({

            color: 0xe6e6e6

        });


    for (
        let z = -480;
        z < 500;
        z += 15
    ) {

        const geometry =
            new THREE.PlaneGeometry(
                0.35,
                7
            );


        const line =
            new THREE.Mesh(
                geometry,
                lineMaterial
            );


        line.rotation.x =
            -Math.PI / 2;


        line.position.set(
            0,
            0.015,
            z
        );


        scene.add(line);

    }


    /* Side road lines */

    const sideMaterial =
        new THREE.MeshBasicMaterial({

            color: 0x00eaff

        });


    [-6.6, 6.6].forEach(x => {

        const geometry =
            new THREE.PlaneGeometry(
                0.12,
                1000
            );


        const line =
            new THREE.Mesh(
                geometry,
                sideMaterial
            );


        line.rotation.x =
            -Math.PI / 2;

        line.position.set(
            x,
            0.02,
            0
        );

        scene.add(line);

    });

}


/* ============================================================
   BUILDINGS
============================================================ */

function createBuildings() {

    const buildingMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x121620,

            roughness: 0.8,

            metalness: 0.2

        });


    for (
        let z = -480;
        z < 500;
        z += 30
    ) {

        createBuilding(
            -18,
            z,
            buildingMaterial
        );

        createBuilding(
            18,
            z + 15,
            buildingMaterial
        );

    }

}


function createBuilding(
    x,
    z,
    material
) {

    const width =
        6 + Math.random() * 6;

    const height =
        8 + Math.random() * 28;

    const depth =
        10 + Math.random() * 8;


    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );


    const building =
        new THREE.Mesh(
            geometry,
            material
        );


    building.position.set(
        x,
        height / 2,
        z
    );


    building.castShadow = true;

    building.receiveShadow = true;


    scene.add(building);

    buildings.push(building);


    /* Windows */

    createWindows(
        building,
        width,
        height,
        depth
    );

}


function createWindows(
    building,
    width,
    height,
    depth
) {

    const windowMaterial =
        new THREE.MeshBasicMaterial({

            color: Math.random() > 0.5
                ? 0x00eaff
                : 0xff1688

        });


    const rows =
        Math.floor(height / 4);

    const columns =
        Math.floor(width / 2);


    for (
        let r = 0;
        r < rows;
        r++
    ) {

        for (
            let c = 0;
            c < columns;
            c++
        ) {

            if (Math.random() < 0.35)
                continue;


            const geometry =
                new THREE.PlaneGeometry(
                    0.7,
                    1.2
                );


            const windowMesh =
                new THREE.Mesh(
                    geometry,
                    windowMaterial
                );


            windowMesh.position.set(

                building.position.x
                - width / 2
                + 1
                + c * 2,

                2
                + r * 4,

                building.position.z
                - depth / 2
                - 0.01

            );


            scene.add(windowMesh);

        }

    }

}


/* ============================================================
   STREET LIGHTS
============================================================ */

function createStreetLights() {

    for (
        let z = -480;
        z < 500;
        z += 40
    ) {

        createStreetLight(
            -9,
            z
        );

        createStreetLight(
            9,
            z + 20
        );

    }

}


function createStreetLight(
    x,
    z
) {

    const poleMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x22262e

        });


    const pole =
        new THREE.Mesh(

            new THREE.CylinderGeometry(
                0.08,
                0.08,
                7
            ),

            poleMaterial

        );


    pole.position.set(
        x,
        3.5,
        z
    );


    scene.add(pole);


    const lamp =
        new THREE.PointLight(
            0x00eaff,
            3,
            25
        );


    lamp.position.set(
        x,
        7,
        z
    );


    scene.add(lamp);


    const bulb =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.15,
                8,
                8
            ),

            new THREE.MeshBasicMaterial({

                color: 0x00eaff

            })

        );


    bulb.position.copy(
        lamp.position
    );

    scene.add(bulb);

}


/* ============================================================
   FINISH LINE
============================================================ */

function createFinishLine() {

    const material =
        new THREE.MeshBasicMaterial({

            color: 0xffffff

        });


    for (
        let x = -6;
        x <= 6;
        x += 1
    ) {

        const geometry =
            new THREE.BoxGeometry(
                1,
                0.05,
                1
            );


        const square =
            new THREE.Mesh(
                geometry,
                material
            );


        square.position.set(
            x,
            0.04,
            -450
        );


        if (
            Math.round(x) % 2 === 0
        ) {

            square.material =
                new THREE.MeshBasicMaterial({
                    color: 0xffffff
                });

        } else {

            square.material =
                new THREE.MeshBasicMaterial({
                    color: 0x111111
                });

        }


        scene.add(square);

    }

}


/* ============================================================
   PLAYER CAR
============================================================ */

function createPlayerCar() {

    const car =
        new THREE.Group();


    car.position.set(
        0,
        0.7,
        420
    );


    /* -------------------------
       BODY
    ------------------------- */

    const bodyMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x005dff,

            metalness: 0.75,

            roughness: 0.25

        });


    const body =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                2.4,
                0.55,
                4.5
            ),

            bodyMaterial

        );


    body.position.y = 0.5;

    body.castShadow = true;

    car.add(body);


    /* -------------------------
       CABIN
    ------------------------- */

    const cabinMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x08111f,

            metalness: 0.5,

            roughness: 0.15

        });


    const cabin =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                1.75,
                0.65,
                1.9
            ),

            cabinMaterial

        );


    cabin.position.set(
        0,
        0.95,
        0.1
    );


    cabin.rotation.x =
        -0.05;


    cabin.castShadow = true;

    car.add(cabin);


    /* -------------------------
       FRONT
    ------------------------- */

    const front =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                2.1,
                0.2,
                0.25
            ),

            new THREE.MeshBasicMaterial({

                color: 0xffffff

            })

        );


    front.position.set(
        0,
        0.57,
        -2.2
    );


    car.add(front);


    /* -------------------------
       REAR LIGHTS
    ------------------------- */

    const rearLightMaterial =
        new THREE.MeshBasicMaterial({

            color: 0xff003c

        });


    [-0.75, 0.75].forEach(x => {

        const light =
            new THREE.Mesh(

                new THREE.BoxGeometry(
                    0.45,
                    0.15,
                    0.08
                ),

                rearLightMaterial

            );


        light.position.set(
            x,
            0.65,
            2.23
        );


        car.add(light);

    });


    /* -------------------------
       WHEELS
    ------------------------- */

    const wheelMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x050505,

            roughness: 0.8

        });


    const wheelPositions = [

        [-1.15, 0.35, -1.5],
        [ 1.15, 0.35, -1.5],

        [-1.15, 0.35, 1.5],
        [ 1.15, 0.35, 1.5]

    ];


    wheelPositions.forEach(
        position => {

            const wheel =
                new THREE.Mesh(

                    new THREE.CylinderGeometry(
                        0.4,
                        0.4,
                        0.28,
                        20
                    ),

                    wheelMaterial

                );


            wheel.rotation.z =
                Math.PI / 2;


            wheel.position.set(
                ...position
            );


            wheel.castShadow = true;

            car.add(wheel);

        }
    );


    /* -------------------------
       NITRO EXHAUST
    ------------------------- */

    const exhaustMaterial =
        new THREE.MeshBasicMaterial({

            color: 0x00eaff

        });


    [-0.55, 0.55].forEach(x => {

        const exhaust =
            new THREE.Mesh(

                new THREE.ConeGeometry(
                    0.12,
                    0.8,
                    8
                ),

                exhaustMaterial

            );


        exhaust.rotation.x =
            -Math.PI / 2;


        exhaust.position.set(
            x,
            0.45,
            2.45
        );


        exhaust.visible = false;


        exhaust.userData.isNitro =
            true;


        car.add(exhaust);

    });


    car.userData.velocity = 0;

    car.userData.steering = 0;

    car.userData.rotationSpeed = 0;


    return car;

}


/* ============================================================
   START GAME
============================================================ */

function startGame() {

    document
        .getElementById("start-screen")
        .style.display = "none";


    started = true;

    paused = false;

    raceTime = 0;

    nitro = 100;

    resetCar();

    startCountdown();

}


/* ============================================================
   COUNTDOWN
============================================================ */

function startCountdown() {

    countdownActive = true;

    const element =
        document.getElementById(
            "countdown"
        );


    element.style.display =
        "flex";


    let count = 3;

    element.textContent = count;


    const interval =
        setInterval(() => {

            count--;


            if (count > 0) {

                element.textContent =
                    count;

            }

            else {

                element.textContent =
                    "GO!";


                setTimeout(() => {

                    element.style.display =
                        "none";

                    countdownActive =
                        false;

                }, 700);


                clearInterval(interval);

            }

        }, 900);

}


/* ============================================================
   GAME LOOP
============================================================ */

function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    if (
        started &&
        !paused &&
        !countdownActive
    ) {

        updatePlayer(
            delta
        );


        updateCamera(
            delta
        );


        updateRace(
            delta
        );

    }


    updateHUD();


    renderer.render(
        scene,
        camera
    );

}


/* ============================================================
   PLAYER UPDATE
============================================================ */

function updatePlayer(
    delta
) {

    const data =
        playerCar.userData;


    /* -------------------------
       ACCELERATION
    ------------------------- */

    if (keys.forward) {

        data.velocity +=
            CONFIG.car.acceleration *
            delta;

    }


    /* -------------------------
       BRAKING
    ------------------------- */

    if (keys.backward) {

        if (data.velocity > 0) {

            data.velocity -=
                CONFIG.car.brakePower *
                delta;

        } else {

            data.velocity -=
                CONFIG.car.acceleration *
                0.6 *
                delta;

        }

    }


    /* -------------------------
       NATURAL DRAG
    ------------------------- */

    if (
        !keys.forward &&
        !keys.backward
    ) {

        if (data.velocity > 0) {

            data.velocity -=
                CONFIG.car.drag *
                delta;

        }

        else if (data.velocity < 0) {

            data.velocity +=
                CONFIG.car.drag *
                delta;

        }

    }


    /* -------------------------
       NITRO
    ------------------------- */

    let maxSpeed =
        CONFIG.car.maxSpeed;


    if (
        keys.nitro &&
        nitro > 0 &&
        data.velocity > 5
    ) {

        data.velocity +=
            CONFIG.nitro.boostPower *
            delta;


        nitro -=
            CONFIG.nitro.durationDrain *
            delta;


        nitro =
            Math.max(
                nitro,
                0
            );


        activateNitroEffects(
            true
        );

    }

    else {

        activateNitroEffects(
            false
        );


        nitro +=
            CONFIG.nitro.recharge *
            delta;


        nitro =
            Math.min(
                nitro,
                100
            );

    }


    /* -------------------------
       LIMIT SPEED
    ------------------------- */

    const absoluteSpeed =
        Math.abs(
            data.velocity
        );


    if (
        absoluteSpeed >
        maxSpeed
    ) {

        data.velocity =
            Math.sign(
                data.velocity
            ) * maxSpeed;

    }


    /* -------------------------
       STEERING
    ------------------------- */

    let steeringInput = 0;


    if (keys.left)
        steeringInput -= 1;

    if (keys.right)
        steeringInput += 1;


    const speedFactor =
        Math.min(
            Math.abs(data.velocity) /
            CONFIG.car.maxSpeed,
            1
        );


    const grip =
        keys.handbrake
            ? CONFIG.car.driftGrip
            : CONFIG.car.grip;


    const steeringStrength =
        CONFIG.car.steering *
        (0.3 + speedFactor * 0.7);


    data.steering +=
        (
            steeringInput *
            steeringStrength -
            data.steering *
            grip
        ) * delta;


    /* -------------------------
       ROTATE CAR
    ------------------------- */

    playerCar.rotation.y -=
        data.steering *
        speedFactor *
        delta;


    /* -------------------------
       MOVE CAR
    ------------------------- */

    const forward =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    forward.applyQuaternion(
        playerCar.quaternion
    );


    playerCar.position.addScaledVector(

        forward,

        data.velocity *
        delta

    );


    /* -------------------------
       KEEP CAR ON ROAD
    ------------------------- */

    playerCar.position.x =
        THREE.MathUtils.clamp(

            playerCar.position.x,

            -5.5,
            5.5

        );


    /* -------------------------
       SIMPLE ROAD LOOP
    ------------------------- */

    if (
        playerCar.position.z <
        -470
    ) {

        playerCar.position.z =
            420;

    }


    /* -------------------------
       DRIFT ROTATION
    ------------------------- */

    if (
        keys.handbrake &&
        Math.abs(data.velocity) > 15
    ) {

        playerCar.rotation.y -=
            steeringInput *
            0.035;

    }


    /* -------------------------
       CAR BOUNCE
    ------------------------- */

    playerCar.position.y =
        0.7 +
        Math.sin(
            performance.now() * 0.01
        ) *
        0.015;

}


/* ============================================================
   NITRO EFFECTS
============================================================ */

function activateNitroEffects(
    active
) {

    playerCar.children.forEach(
        child => {

            if (
                child.userData &&
                child.userData.isNitro
            ) {

                child.visible =
                    active;

            }

        }
    );


    if (active) {

        camera.fov =
            THREE.MathUtils.lerp(
                camera.fov,
                75,
                0.1
            );

    }

    else {

        camera.fov =
            THREE.MathUtils.lerp(
                camera.fov,
                65,
                0.1
            );

    }


    camera.updateProjectionMatrix();

}


/* ============================================================
   CAMERA
============================================================ */

function updateCamera(
    delta
) {

    const speed =
        Math.abs(
            playerCar.userData.velocity
        );


    const speedFactor =
        Math.min(
            speed /
            CONFIG.car.maxSpeed,
            1
        );


    const targetPosition =
        new THREE.Vector3();


    const behind =
        new THREE.Vector3(
            0,
            CONFIG.camera.height +
                speedFactor * 0.7,
            CONFIG.camera.distance +
                speedFactor * 2.5
        );


    behind.applyQuaternion(
        playerCar.quaternion
    );


    targetPosition.copy(
        playerCar.position
    );

    targetPosition.add(
        behind
    );


    camera.position.lerp(
        targetPosition,
        1 -
        Math.pow(
            0.001,
            delta
        )
    );


    const lookAt =
        playerCar.position.clone();


    lookAt.y += 0.8;


    camera.lookAt(
        lookAt
    );

}


/* ============================================================
   RACE TIMER
============================================================ */

function updateRace(
    delta
) {

    raceTime += delta;

}


/* ============================================================
   HUD
============================================================ */

function updateHUD() {

    if (!playerCar)
        return;


    const speed =
        Math.abs(
            playerCar.userData.velocity
        );


    const kmh =
        Math.round(
            speed * 3.6
        );


    document
        .getElementById("speed")
        .textContent =
        kmh;


    /* -------------------------
       GEAR
    ------------------------- */

    let gear = "N";


    if (speed > 3)
        gear = "1";

    if (speed > 15)
        gear = "2";

    if (speed > 28)
        gear = "3";

    if (speed > 42)
        gear = "4";

    if (speed > 55)
        gear = "5";


    document
        .getElementById("gear")
        .textContent =
        gear;


    /* -------------------------
       RPM
    ------------------------- */

    const rpm =
        Math.min(
            speed /
            CONFIG.car.maxSpeed *
            100,
            100
        );


    document
        .getElementById("rpm-fill")
        .style.width =
        rpm + "%";


    /* -------------------------
       NITRO
    ------------------------- */

    document
        .getElementById("nitro-fill")
        .style.width =
        nitro + "%";


    document
        .getElementById("nitro-percent")
        .textContent =
        Math.round(nitro) + "%";


    /* -------------------------
       TIMER
    ------------------------- */

    document
        .getElementById("timer")
        .textContent =
        formatTime(
            raceTime
        );

}


/* ============================================================
   TIME FORMAT
============================================================ */

function formatTime(
    seconds
) {

    const minutes =
        Math.floor(
            seconds / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    const milliseconds =
        Math.floor(
            (seconds % 1) * 100
        );


    return (

        String(minutes)
            .padStart(2, "0")

        + ":" +

        String(secs)
            .padStart(2, "0")

        + "." +

        String(milliseconds)
            .padStart(2, "0")

    );

}


/* ============================================================
   RESET CAR
============================================================ */

function resetCar() {

    if (!playerCar)
        return;


    playerCar.position.set(
        0,
        0.7,
        420
    );


    playerCar.rotation.set(
        0,
        0,
        0
    );


    playerCar.userData.velocity =
        0;

    playerCar.userData.steering =
        0;


    nitro = 100;

}


/* ============================================================
   PAUSE
============================================================ */

function pauseGame() {

    if (!started)
        return;


    paused = true;


    document
        .getElementById("pause-menu")
        .style.display =
        "flex";

}


function resumeGame() {

    paused = false;


    document
        .getElementById("pause-menu")
        .style.display =
        "none";

}


function restartGame() {

    paused = false;

    raceTime = 0;

    resetCar();


    document
        .getElementById("pause-menu")
        .style.display =
        "none";


    startCountdown();

}


/* ============================================================
   RESIZE
============================================================ */

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}


/* ============================================================
   START
============================================================ */

init();