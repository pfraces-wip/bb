angular.module('bb', ['directives', 'device', 'chrono', 'notifications'])

.controller('clock', function ($scope, $interval, on, chrono, vibrate, beep) {
  'use strict';
  
  var exit = function () {
    navigator.app.exitApp();
  };

  var background = function () {
    navigator.Backbutton.goHome();
  };
  
  var zeroPad = function (str) {
    str = '' + str;
    return (str.length < 2 ? '0' : '') + str;
  };
  
  var msFmt = function (ms) {
    var acc = ms;
    var miliseconds = acc % 1000;
    acc = (acc - miliseconds) / 1000;
    var seconds = acc % 60;
    acc = (acc - seconds) / 60;
    var minutes = acc % 60;
  
    return zeroPad(minutes) + ':' + zeroPad(seconds);
  };
  
  var currentPlayer = function () {
    return $scope[$scope.isBlackPlaying ? 'black' : 'white'];
  };
  
  var remainingMilisecondsFn = function (player) {
    return function () {
      var turnTime  = $scope.settings.period * 1000;
      return turnTime - player.chrono.elapsed();
    };
  };
  
  var remainingPeriodsFn = function (player) {
    return function () {
      return $scope.settings.periods - player.periods;
    };
  };

  var initPlayer = function (name) {
    var player = $scope[name] = {
      elapsed: 0,
      periods: 0,
      chrono: chrono()
    };
    
    player.remainingMiliseconds = remainingMilisecondsFn(player);
    player.remainingPeriods = remainingPeriodsFn(player);

    player.remainingTime = function () {
      return msFmt(player.remainingMiliseconds());
    };

    $scope.$watch(player.remainingTime, function () {
      if ($scope.showSettings) { return; }
      if (player.remainingMiliseconds() >= 10000) { return; }
      beep();
    });
  };
  
  var init = function () {
    $scope.gameOver = false;
    $scope.playing = true;
    $scope.showMenu = false;
    $scope.showSettings = true;
    $scope.isBlackPlaying = true;
    $scope.initialMove = true;
    
    initPlayer('black');
    initPlayer('white');
  };
  
  var newGame = function () {
    init();
    $scope.showSettings = false;
  };
  
  var pollingChrono = null;
  
  var stopPollingChrono = function () {
    $interval.cancel(pollingChrono);
  };
  
  var pauseGame = function () {
    $scope.playing = false;
    if ($scope.initialMove) { return; }
    
    currentPlayer().chrono.stop();
    stopPollingChrono();
  };
  
  var startPollingChrono = function () {
    pollingChrono = $interval(function () {
      var player = currentPlayer();
      
      if (player.remainingMiliseconds() <= 0) {
        if (!player.remainingPeriods()) {
          $scope.gameOver = true;
          pauseGame();
          return;
        }

        player.chrono.stop();
      }
    }, 200);
  };
  
  var resumeGame = function () {
    if ($scope.gameOver) { return; }

    $scope.playing = true;
    if ($scope.initialMove) { return; }
    
    currentPlayer().chrono.start();
    startPollingChrono();
  };
  
  var togglePause = function () {
    if ($scope.showSettings) { return; }

    $scope.showMenu = !$scope.showMenu;
    if ($scope.gameOver) { return; }

    if ($scope.playing) {
      pauseGame();
      return;
    }
    
    resumeGame();
  };
  
  var switchPlayer = function (initial) {
    if ($scope.gameOver) { return; }
    vibrate();
    
    if ($scope.initialMove) {
      $scope.initialMove = false;
      $scope.isBlackPlaying = (initial === 'black');
      currentPlayer().periods += 1;
      resumeGame();
      return;
    }
    
    var player = currentPlayer();
    player.chrono.stop();
    player.chrono.reset();

    $scope.isBlackPlaying = !$scope.isBlackPlaying;
    player = currentPlayer();

    if (!player.remainingPeriods()) {
      $scope.gameOver = true;
      pauseGame();
      return;
    }

    player.periods += 1;
    player.chrono.start();
  };
  
  $scope.settings = {
    players: {
      local: 'Local',
      visitor: 'Visitor'
    },
    periods: 8,
    period: 4 * 60 // seconds
  };
  
  $scope.msFmt = msFmt;
  $scope.switchPlayer = switchPlayer;
  $scope.reset = init;
  $scope.newGame = newGame;
  $scope.exit = exit;
  
  init();

  on('menubutton', togglePause);
  
  on('backbutton', function () {
    if ($scope.showMenu) {
      togglePause();
      return;
    }
    
    if (!$scope.playing || $scope.initialMove) {
      exit();
      return;
    }
    
    background();
  });
});
