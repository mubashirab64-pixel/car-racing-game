(function(){
  "use strict";

  // ---------------------------------------------------------------
  // Canvas setup
  // ---------------------------------------------------------------
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  // ---------------------------------------------------------------
  // City layout (shared across all levels)
  // ---------------------------------------------------------------
  var CITY_BUILDINGS = [
    {x:60,  y:90,  w:150, h:140},
    {x:280, y:90,  w:150, h:140},
    {x:500, y:90,  w:150, h:140},
    {x:720, y:90,  w:120, h:140},
    {x:60,  y:340, w:150, h:140},
    {x:280, y:340, w:150, h:140},
    {x:500, y:340, w:150, h:140},
    {x:720, y:340, w:120, h:140}
  ];

  var OBSTACLE_POOL = [
    {x:150, y:278, w:34, h:18},
    {x:380, y:278, w:34, h:18},
    {x:600, y:278, w:34, h:18},
    {x:150, y:518, w:34, h:18},
    {x:600, y:518, w:34, h:18},
    {x:26,  y:180, w:18, h:34},
    {x:866, y:180, w:18, h:34},
    {x:26,  y:420, w:18, h:34}
  ];

  var LEVELS = [
    { start:{x:90,  y:555, angle:-Math.PI/2}, goal:{x:790,y:35,w:80,h:45},  copCount:2, copSpeed:2.15, obstacleCount:0 },
    { start:{x:90,  y:45,  angle: Math.PI/2}, goal:{x:790,y:520,w:80,h:45}, copCount:3, copSpeed:2.5,  obstacleCount:2 },
    { start:{x:800, y:555, angle: Math.PI  }, goal:{x:40, y:35, w:80,h:45}, copCount:4, copSpeed:2.85, obstacleCount:4 },
    { start:{x:800, y:45,  angle: Math.PI  }, goal:{x:40, y:520,w:80,h:45}, copCount:5, copSpeed:3.2,  obstacleCount:6 },
    { start:{x:450, y:555, angle:-Math.PI/2}, goal:{x:420,y:30, w:80,h:45}, copCount:6, copSpeed:3.55, obstacleCount:8 }
  ];

  var PLAYER_MAX_SPEED = 4.3;
  var PLAYER_REV_SPEED = -2.2;
  var PLAYER_ACCEL = 0.18;
  var PLAYER_FRICTION = 0.965;
  var PLAYER_TURN = 0.055;
  var COP_TURN = 0.045;
  var CAR_COLLIDE_R = 14;      // vs buildings
  var CAR_VS_CAR_R = 24;       // player vs cop
  var COIN_R = 12;

  // ---------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------
  var state = 'start'; // start | playing | paused | levelcomplete | wasted | busted | win
  var currentLevel = 0;
  var score = 0, cash = 0;
  var wantedLevel = 0, lastHitTime = 0;
  var levelStartTime = 0;
  var lastTs = 0;

  var player, cops = [], coins = [], obstacles = [], goal = null;

  var input = {up:false, down:false, left:false, right:false};

  // ---------------------------------------------------------------
  // Audio (simple procedural beeps, no external files)
  // ---------------------------------------------------------------
  var audioCtx = null;
  function getAudio(){
    if (!audioCtx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function beep(freq, dur, type, vol){
    var ac = getAudio();
    if (!ac) return;
    try{
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = (vol===undefined?0.15:vol);
      o.connect(g); g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.stop(ac.currentTime + dur);
    }catch(e){}
  }
  function sfxCoin(){ beep(880, 0.08, 'square', 0.12); }
  function sfxCrash(){ beep(120, 0.25, 'sawtooth', 0.2); }
  function sfxClear(){
    beep(523,0.12,'square',0.15);
    setTimeout(function(){beep(659,0.12,'square',0.15);},110);
    setTimeout(function(){beep(784,0.22,'square',0.15);},220);
  }
  function sfxWasted(){ beep(140,0.5,'sawtooth',0.2); setTimeout(function(){beep(90,0.5,'sawtooth',0.2);},150); }
  function sfxBusted(){ beep(300,0.15,'square',0.18); setTimeout(function(){beep(220,0.3,'square',0.18);},160); }

  // ---------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------
  function circleRectHit(cx, cy, cr, rx, ry, rw, rh){
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX, dy = cy - closestY;
    return (dx*dx + dy*dy) < (cr*cr);
  }
  function hitsAnyBuilding(x, y, r){
    var i;
    for (i=0;i<CITY_BUILDINGS.length;i++){
      if (circleRectHit(x,y,r, CITY_BUILDINGS[i].x, CITY_BUILDINGS[i].y, CITY_BUILDINGS[i].w, CITY_BUILDINGS[i].h)) return true;
    }
    for (i=0;i<obstacles.length;i++){
      if (circleRectHit(x,y,r, obstacles[i].x, obstacles[i].y, obstacles[i].w, obstacles[i].h)) return true;
    }
    return false;
  }
  function pointBlockedForSpawn(x,y,buffer){
    var i, b;
    for (i=0;i<CITY_BUILDINGS.length;i++){
      b = CITY_BUILDINGS[i];
      if (x > b.x-buffer && x < b.x+b.w+buffer && y > b.y-buffer && y < b.y+b.h+buffer) return true;
    }
    for (i=0;i<obstacles.length;i++){
      b = obstacles[i];
      if (x > b.x-buffer && x < b.x+b.w+buffer && y > b.y-buffer && y < b.y+b.h+buffer) return true;
    }
    return false;
  }
  function randomRoadPoint(minDist, refX, refY){
    for (var tries=0; tries<150; tries++){
      var x = 30 + Math.random()*(W-60);
      var y = 30 + Math.random()*(H-60);
      if (pointBlockedForSpawn(x,y,22)) continue;
      if (minDist && refX!==undefined){
        var d = Math.hypot(x-refX, y-refY);
        if (d < minDist) continue;
      }
      return {x:x,y:y};
    }
    return {x:W/2, y:H/2};
  }

  // ---------------------------------------------------------------
  // Level setup
  // ---------------------------------------------------------------
  function spawnCop(speed){
    var p = randomRoadPoint(230, player.x, player.y);
    return {x:p.x, y:p.y, angle:Math.random()*Math.PI*2, speed:speed};
  }
  function spawnCoins(n){
    var arr = [];
    for (var i=0;i<n;i++){
      var p = randomRoadPoint();
      arr.push({x:p.x, y:p.y, taken:false});
    }
    return arr;
  }

  function initLevel(idx){
    var cfg = LEVELS[idx];
    player = {
      x: cfg.start.x, y: cfg.start.y, angle: cfg.start.angle,
      speed: 0, health: 100, invulnUntil: 0
    };
    obstacles = OBSTACLE_POOL.slice(0, cfg.obstacleCount);
    goal = cfg.goal;
    wantedLevel = 0;
    lastHitTime = performance.now();
    cops = [];
    for (var i=0;i<cfg.copCount;i++) cops.push(spawnCop(cfg.copSpeed));
    coins = spawnCoins(10);
    levelStartTime = performance.now();
    updateHUD();
  }

  // ---------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------
  var screens = {
    start: document.getElementById('screen-start'),
    levelcomplete: document.getElementById('screen-levelcomplete'),
    wasted: document.getElementById('screen-wasted'),
    busted: document.getElementById('screen-busted'),
    win: document.getElementById('screen-win'),
    paused: document.getElementById('screen-paused')
  };
  function hideAllScreens(){
    for (var k in screens){ screens[k].classList.add('hidden'); }
  }
  function showScreen(name){
    hideAllScreens();
    if (name) screens[name].classList.remove('hidden');
  }

  function updateHUD(){
    document.getElementById('scoreVal').textContent = score;
    document.getElementById('cashVal').textContent = cash;
    document.getElementById('levelBadge').textContent = 'LEVEL ' + (currentLevel+1) + ' / ' + LEVELS.length;
    document.getElementById('healthBar').style.width = Math.max(0, player.health) + '%';
    var hb = document.getElementById('healthBar');
    hb.style.background = player.health > 50
      ? 'linear-gradient(90deg,#2fd44b,#8fe84f)'
      : (player.health > 20 ? 'linear-gradient(90deg,#e8c53c,#f2e089)' : 'linear-gradient(90deg,#e8433a,#f27a73)');
    var stars = '';
    for (var i=0;i<5;i++){
      stars += (i < wantedLevel) ? '<span class="star-on">★</span>' : '<span class="star-off">☆</span>';
    }
    document.getElementById('wantedStars').innerHTML = stars;
  }

  // ---------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------
  function drawDashedLine(x1,y1,x2,y2){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,201,60,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16,14]);
    ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground(){
    ctx.fillStyle = '#333333';
    ctx.fillRect(0,0,W,H);
    drawDashedLine(0,45,W,45);
    drawDashedLine(0,285,W,285);
    drawDashedLine(0,540,W,540);
    drawDashedLine(30,0,30,H);
    drawDashedLine(245,0,245,H);
    drawDashedLine(465,0,465,H);
    drawDashedLine(685,0,685,H);
    drawDashedLine(870,0,870,H);
  }

  function drawBuildings(){
    for (var i=0;i<CITY_BUILDINGS.length;i++){
      var b = CITY_BUILDINGS[i];
      ctx.fillStyle = (i%2===0) ? '#5a5248' : '#4c463d';
      ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle = '#221f1a';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x,b.y,b.w,b.h);
      ctx.fillStyle = 'rgba(255,201,60,0.28)';
      var cols = Math.max(2, Math.floor(b.w/28));
      var rows = Math.max(2, Math.floor(b.h/28));
      for (var r=0;r<rows;r++){
        for (var c=0;c<cols;c++){
          if ((r+c)%3===0) continue;
          var wx = b.x + 10 + c*((b.w-20)/cols);
          var wy = b.y + 10 + r*((b.h-20)/rows);
          ctx.fillRect(wx,wy,8,8);
        }
      }
    }
    ctx.fillStyle = '#2b2b2b';
    for (var j=0;j<obstacles.length;j++){
      var o = obstacles[j];
      ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
      ctx.strokeRect(o.x,o.y,o.w,o.h);
    }
  }

  function drawGoal(){
    var pulse = 0.5 + 0.5*Math.sin(performance.now()/180);
    ctx.save();
    ctx.strokeStyle = 'rgba(80,230,120,' + (0.5+0.5*pulse) + ')';
    ctx.lineWidth = 4;
    ctx.setLineDash([10,8]);
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = 'rgba(80,230,120,0.18)';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#c9ffd6';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', goal.x+goal.w/2, goal.y+goal.h/2+4);
    ctx.restore();
  }

  function drawCoins(){
    for (var i=0;i<coins.length;i++){
      var c = coins[i];
      if (c.taken) continue;
      var bob = Math.sin(performance.now()/220 + i)*2;
      ctx.save();
      ctx.fillStyle = '#ffd85e';
      ctx.strokeStyle = '#8a6f1f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y+bob, COIN_R-3, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6f1f';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('$', c.x, c.y+bob+4);
      ctx.restore();
    }
  }

  function drawCar(x, y, angle, bodyColor, isCop){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-15,-9,30,20);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-15,-9,30,18);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-15,-9,30,18);
    ctx.fillStyle = 'rgba(30,40,55,0.85)';
    ctx.fillRect(2,-6,9,12);
    ctx.fillStyle = '#fff6c7';
    ctx.fillRect(13,-7,2,4);
    ctx.fillRect(13,3,2,4);
    if (isCop){
      var flash = (Math.floor(performance.now()/200) % 2 === 0);
      ctx.fillStyle = flash ? '#3fa9f5' : '#e8433a';
      ctx.fillRect(-4,-10,8,4);
    }
    ctx.restore();
  }

  function render(){
    drawBackground();
    drawBuildings();
    drawGoal();
    drawCoins();
    for (var i=0;i<cops.length;i++) drawCar(cops[i].x, cops[i].y, cops[i].angle, '#e9e6da', true);
    if (player){
      var invuln = performance.now() < player.invulnUntil;
      if (!invuln || Math.floor(performance.now()/80)%2===0){
        drawCar(player.x, player.y, player.angle, '#d1372b', false);
      }
    }
  }

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------
  function updatePlayer(dt){
    if (input.up) player.speed = Math.min(PLAYER_MAX_SPEED, player.speed + PLAYER_ACCEL*dt);
    else if (input.down) player.speed = Math.max(PLAYER_REV_SPEED, player.speed - PLAYER_ACCEL*dt);
    else player.speed *= Math.pow(PLAYER_FRICTION, dt);

    if (Math.abs(player.speed) > 0.02){
      if (input.left) player.angle -= PLAYER_TURN*dt;
      if (input.right) player.angle += PLAYER_TURN*dt;
    }

    var nx = player.x + Math.cos(player.angle)*player.speed*dt;
    var ny = player.y + Math.sin(player.angle)*player.speed*dt;
    nx = Math.max(14, Math.min(W-14, nx));
    ny = Math.max(14, Math.min(H-14, ny));

    if (hitsAnyBuilding(nx, ny, CAR_COLLIDE_R)){
      player.speed *= -0.25;
    } else {
      player.x = nx; player.y = ny;
    }
  }

  function updateCops(dt){
    for (var i=0;i<cops.length;i++){
      var c = cops[i];
      var desired = Math.atan2(player.y - c.y, player.x - c.x);
      var diff = desired - c.angle;
      while (diff > Math.PI) diff -= Math.PI*2;
      while (diff < -Math.PI) diff += Math.PI*2;
      c.angle += Math.max(-COP_TURN*dt, Math.min(COP_TURN*dt, diff));

      var nx = c.x + Math.cos(c.angle)*c.speed*dt;
      var ny = c.y + Math.sin(c.angle)*c.speed*dt;
      nx = Math.max(14, Math.min(W-14, nx));
      ny = Math.max(14, Math.min(H-14, ny));

      if (hitsAnyBuilding(nx, ny, CAR_COLLIDE_R)){
        c.angle += (Math.random()-0.5)*1.4;
      } else {
        c.x = nx; c.y = ny;
      }
    }
  }

  function updateCoinsCollection(){
    for (var i=0;i<coins.length;i++){
      var c = coins[i];
      if (c.taken) continue;
      var d = Math.hypot(player.x-c.x, player.y-c.y);
      if (d < COIN_R + 10){
        c.taken = true;
        score += 10; cash += 10;
        sfxCoin();
      }
    }
  }

  function updateCopCollisions(now){
    if (now < player.invulnUntil) return;
    for (var i=0;i<cops.length;i++){
      var c = cops[i];
      var d = Math.hypot(player.x-c.x, player.y-c.y);
      if (d < CAR_VS_CAR_R){
        lastHitTime = now;
        player.invulnUntil = now + 1000;
        sfxCrash();
        if (wantedLevel >= 5){
          triggerBusted();
          return;
        }
        wantedLevel = Math.min(5, wantedLevel+1);
        player.health -= 15;
        var ang = Math.atan2(player.y-c.y, player.x-c.x);
        player.x += Math.cos(ang)*18;
        player.y += Math.sin(ang)*18;
        if (player.health <= 0){
          triggerWasted();
          return;
        }
        break;
      }
    }
  }

  function updateWantedDecay(now){
    if (now - lastHitTime > 4000 && wantedLevel > 0){
      wantedLevel = 0;
      lastHitTime = now;
    }
  }

  function checkGoal(){
    if (circleRectHit(player.x, player.y, 14, goal.x, goal.y, goal.w, goal.h)){
      triggerLevelComplete();
    }
  }

  // ---------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------
  function triggerLevelComplete(){
    state = 'levelcomplete';
    var timeTaken = (performance.now() - levelStartTime)/1000;
    var timeBonus = Math.max(0, Math.round(400 - timeTaken*4));
    var levelBonus = (currentLevel+1)*100;
    score += timeBonus + levelBonus;
    sfxClear();
    document.getElementById('lcBreakdown').textContent =
      'Coins collected + Time bonus (' + timeBonus + ') + Level bonus (' + levelBonus + ')';
    document.getElementById('lcScore').textContent = score;
    updateHUD();
    showScreen('levelcomplete');
  }

  function triggerWasted(){
    state = 'wasted';
    sfxWasted();
    document.getElementById('wastedScore').textContent = score;
    showScreen('wasted');
  }

  function triggerBusted(){
    state = 'busted';
    sfxBusted();
    document.getElementById('bustedScore').textContent = score;
    showScreen('busted');
  }

  function triggerWin(){
    state = 'win';
    document.getElementById('winScore').textContent = score;
    showScreen('win');
  }

  // ---------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------
  function loop(ts){
    requestAnimationFrame(loop);
    if (state !== 'playing') { lastTs = ts; return; }
    var dt = lastTs ? Math.min((ts-lastTs)/16.6667, 3) : 1;
    lastTs = ts;

    var now = performance.now();
    updatePlayer(dt);
    updateCops(dt);
    updateCoinsCollection();
    updateCopCollisions(now);
    updateWantedDecay(now);
    if (state === 'playing') checkGoal();
    updateHUD();
    render();
  }
  requestAnimationFrame(loop);

  // ---------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------
  function setKey(code, val){
    if (code==='KeyW' || code==='ArrowUp') input.up = val;
    else if (code==='KeyS' || code==='ArrowDown') input.down = val;
    else if (code==='KeyA' || code==='ArrowLeft') input.left = val;
    else if (code==='KeyD' || code==='ArrowRight') input.right = val;
  }
  window.addEventListener('keydown', function(e){
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code)>-1) e.preventDefault();
    setKey(e.code, true);
    if (e.code === 'KeyP') togglePause();
  });
  window.addEventListener('keyup', function(e){
    setKey(e.code, false);
  });

  function bindTouchButton(id, onFn, offFn){
    var el = document.getElementById(id);
    if (!el) return;
    var start = function(e){ e.preventDefault(); onFn(); };
    var end = function(e){ e.preventDefault(); offFn(); };
    el.addEventListener('touchstart', start, {passive:false});
    el.addEventListener('touchend', end, {passive:false});
    el.addEventListener('touchcancel', end, {passive:false});
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }
  bindTouchButton('btn-up',    function(){input.up=true;},    function(){input.up=false;});
  bindTouchButton('btn-gas',   function(){input.up=true;},    function(){input.up=false;});
  bindTouchButton('btn-down',  function(){input.down=true;},  function(){input.down=false;});
  bindTouchButton('btn-brake', function(){input.down=true;},  function(){input.down=false;});
  bindTouchButton('btn-left',  function(){input.left=true;},  function(){input.left=false;});
  bindTouchButton('btn-right', function(){input.right=true;}, function(){input.right=false;});

  // ---------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------
  function togglePause(){
    if (state === 'playing'){
      state = 'paused';
      showScreen('paused');
    } else if (state === 'paused'){
      state = 'playing';
      showScreen(null);
      lastTs = 0;
    }
  }
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('btn-resume').addEventListener('click', togglePause);

  // ---------------------------------------------------------------
  // Buttons
  // ---------------------------------------------------------------
  function beginGame(){
    getAudio();
    score = 0; cash = 0; currentLevel = 0;
    initLevel(currentLevel);
    state = 'playing';
    lastTs = 0;
    showScreen(null);
  }
  function retrySameLevel(){
    initLevel(currentLevel);
    state = 'playing';
    lastTs = 0;
    showScreen(null);
  }
  function goToNextLevel(){
    currentLevel++;
    if (currentLevel >= LEVELS.length){
      triggerWin();
      return;
    }
    initLevel(currentLevel);
    state = 'playing';
    lastTs = 0;
    showScreen(null);
  }
  function backToMenu(){
    state = 'start';
    showScreen('start');
  }

  document.getElementById('btn-start').addEventListener('click', beginGame);
  document.getElementById('btn-next').addEventListener('click', goToNextLevel);
  document.getElementById('btn-retry-wasted').addEventListener('click', retrySameLevel);
  document.getElementById('btn-retry-busted').addEventListener('click', retrySameLevel);
  document.getElementById('btn-menu-wasted').addEventListener('click', backToMenu);
  document.getElementById('btn-menu-busted').addEventListener('click', backToMenu);
  document.getElementById('btn-playagain').addEventListener('click', beginGame);

  showScreen('start');
})();