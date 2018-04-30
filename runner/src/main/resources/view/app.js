import * as config from '../config.js';
import { Drawer } from '../core/Drawer.js';
import { ErrorLog } from '../core/ErrorLog.js';
import { demo } from '../demo.js';

function PlayerCtrl($scope, $timeout, $interval, $translate, drawerFactory, gameManagerFactory, $localStorage) {
  'ngInject';
  const ctrl = this;
  let player = null;
  let lastWidth;
  let currentFrame = null;

  let playerLoadedPromise = new Promise((resolve) => {
    $scope.playerLoaded = function (playerApi) {
      ctrl.playerApi = playerApi;
      resolve(playerApi);
    };
  });

  $scope.gameParams = $localStorage.$default({
    gameParams: {}
  }).gameParams;
  $scope.loadGame = loadGame;
  $scope.selectReplay = selectReplay;
  $scope.exportZip = exportZip;
  $scope.reportItems = {};
  $scope.closeReportPopup = closeReportPopup;
  $scope.submitConfig = submitConfig;

  $interval(checkSize, 1000);

  $scope.errors = "";
  ErrorLog.listen(function (error) {
    $scope.errors += error.message + '\n';
  });

  init();

  /////////////////

  function init() {
    drawerFactory.createDrawer(Drawer).then(drawer => {
      $scope.drawer = drawer;
      let data = fetchGame().then(data => {
        ctrl.data = data;
        if (!demo && !config.demo) {
          loadGame();
        }
      });
    });
  }

  function loadGame() {
    if ($scope.gameLoaded || !ctrl.data) {
      return;
    }
    $scope.gameLoaded = true;
    ctrl.gameInfo = convertFrameFormat(ctrl.data);
    $scope.agents = { ...ctrl.data.agents };

    ctrl.gameManager = gameManagerFactory.createGameManagerFromGameInfo($scope.drawer, ctrl.gameInfo, true);
    ctrl.gameManager.subscribe(onUpdate);

    return playerLoadedPromise.then(playerApi => {
      playerApi.initReplay(ctrl.gameManager);
      playerApi.initReplay(ctrl.gameManager);
    });
  }

  function onUpdate(frame, progress, playing, isSubFrame, isTurnBased, atEnd) {
    if (ctrl.gameInfo.frames[frame].keyframe && frame !== currentFrame) {
      $timeout(() => {
        currentFrame = frame;
        onFrameChange(frame);
      });
    }
  }

  function onFrameChange(frame) {
    let startFrame = frame;
    while (startFrame > 0 && !ctrl.gameInfo.frames[startFrame - 1].keyframe) {
      startFrame--;
    }

    for (var i in ctrl.data.ids) {
      $scope.agents[i].stdout = null;
      $scope.referee = {};
    }

    while (startFrame <= frame) {
      for (var i in ctrl.data.ids) {
        const stdout = ctrl.data.outputs[i][startFrame];
        if (stdout) {
          $scope.agents[i].stdout = stdout;
        }
        const stderr = ctrl.data.errors[i][startFrame];
        if (stderr) {
          $scope.agents[i].stderr = stderr;
        }
      }
      $scope.referee.stdout = $scope.referee.stdout || ctrl.data.outputs.referee[startFrame];
      $scope.summary = convertNameTokens(ctrl.data.summaries[startFrame]);
      startFrame++;
    }
  }

  function convertNameTokens(value) {
    return value && value.replace(/\$(\d)/g, 'Player $1');
  }

  function convertFrameFormat(data) {
    const frames = data.views.map(v => {
      let f = v.split('\n');
      let header = f[0].split(' ');

      return { view: v.replace(/^(KEY_FRAME)|(INTERMEDIATE_FRAME)/, ''), keyframe: header[0] === 'KEY_FRAME' };
    });
    for (let i = 0; i < frames.length; i++) {
      frames[i].gameSummary = data.summaries[i];
      for (var pi in data.ids) {
        frames[i].stderr = frames[i].stderr || data.errors[pi][i];
        frames[i].stdout = frames[i].stdout || data.outputs[pi][i];
      }
      frames[i].agentId = -1;
    }
    const agents = data.agents.map(a => Object.assign(a, { avatarUrl: a.avatar }));
    const tooltips = data.tooltips.map(JSON.stringify);
    return { agents: agents, frames: frames, tooltips: tooltips };
  }

  function checkSize() {
    if (!player) {
      player = $('#cg-player').find('.player');
    }
    const newWidth = player.width();
    if (newWidth !== lastWidth) {
      lastWidth = newWidth;
      if (ctrl.playerApi) {
        ctrl.playerApi.resize();
      }
    }
  }

  function fetchGame() {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.onload = function () {
        let result = null;
        try {
          const json = JSON.parse(this.responseText);
          json.agents.forEach(agent => agent.color = Drawer.playerColors[agent.index]);
          result = json
        } catch (e) {
          console.error(e);
          reject(e);
        }
        resolve(result);
      };
      xhr.open('GET', 'game.json', true);
      xhr.send();
    });
  }

  $scope.selectProgress = 'inactive';
  async function selectReplay() {
    $scope.selectProgress = 'saving';
    const response = await fetch('/services/save-replay');
    $scope.selectProgress = 'complete';
  }

  function closeReportPopup() {
    $scope.showExport = false;
  }

  $scope.showExport = false;
  $scope.showConfigForm = false;
  async function exportZip() {
    const data = await fetch('/services/export');
    if (data.status >= 400 && data.status < 500) {
      const text = await data.text();
      $scope.formStatement = text;
      $scope.showConfigForm = true;
    } else {
      const jsonStr = await data.text();
      var jsonObj = JSON.parse(jsonStr);

      var parser = new Parser();
      for (var stub in jsonObj.stubs) {
        try {
          parser.parse(jsonObj.stubs[stub], 0);
        } catch (e) {
          jsonObj.reportItems.push({ "type": "WARNING", "message": stub, "details": { "name": e.name, "params": e.params } });
        }
      }

      if (jsonObj.exportStatus === "SUCCESS") {
        jsonObj.reportItems.push({ "type": "SUCCESS", "message": "Export success." });
        var url = window.URL.createObjectURL(new Blob(
          _base64ToArrayBuffer(jsonObj.data)));
        var a = document.createElement('a');
        a.href = url;
        a.download = "export.zip";
        a.click();
      } else {
        jsonObj.reportItems.push({ "type": "FAIL", "message": "Export fail." });
      }
      $scope.reportItems = jsonObj.reportItems;
      $scope.showExport = true;
    }
  }

  function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return [bytes];
  }

  async function submitConfig(){
    const data = await fetch('/services/init-config');
    $scope.showConfigForm = false;
    exportZip();
  }

  $('#form').submit(function(e){
    e.preventDefault();
    $.ajax({
        url:'/services/init-config',
        type:'get',
        data:$('#form').serialize(),
        success:function(){}
    });
});
}

angular.module('player').controller('PlayerCtrl', PlayerCtrl);
