const { Readable, Writeable } = require('tera-data-parser/lib/protocol/stream');
const Command = require('command');

const EP_OPCODE = 36974;

module.exports = function Follow(dispatch) {
  const command = Command(dispatch);
  let startTime = new Date().getTime();
  let startXp = 0;
  let currentXp = 0;
  let timeout = null;
  let start = 0;
  let blockDelay = 10;
  let setDelay = 130;
  let loc = { };
  let w = 0;

  command.add('epbd', del => {
    let newDel = Number(del);

    if (isNaN(newDel)) {
      command.message('Please enter a number.');
      return;
    }
    blockDelay = newDel;
    start = 1;
  });

  command.add('epsd', del => {
    let newDel = Number(del);

    if (isNaN(newDel) || newDel < 50) {
      command.message('Please enter a number greater than 50.');
      return;
    }
    setDelay = newDel;
    start = 1;
  });

  command.add('epkill', () => {
    if (timeout) {
      command.message('Stopping. Gained ' + Number(currentXp - startXp).toLocaleString() + ' EPXP in ' + getScriptTime(startTime) + '!');
      clearTimeout(timeout);
      timeout = null;
      start = 0;
    } else {
      start = 1;
      sendAttack();
    }
  });

  let sendAttack = function() {
    dispatch.toServer('C_START_SKILL', 7, {
      skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: 11200 },
      loc: loc,
      w: w,
      dest: { x: 0, y: 0, z: 0 },
      unk: true,
      moving: false,
      target: { low: 0, high: 0, unsigned: true },
      unk2: false
    });
    setTimeout(() => {
      dispatch.toServer('C_PRESS_SKILL', 4, {
        skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: 320100 },
        press: true,
        loc: loc,
        w: w
      });
      dispatch.toServer('C_PRESS_SKILL', 4, {
        skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: 320100 },
        press: false,
        loc: loc,
        w: w
      });
    }, setDelay);
    timeout = setTimeout(sendAttack, (blockDelay+setDelay))
  }

  dispatch.hook('C_PLAYER_LOCATION', 4, event => {
    loc = event.loc;
    w = event.w;
  });

  dispatch.hook('*', 'raw', { order: 999, type: 'all' }, (code, data, incoming, fake) => {
    if (code == EP_OPCODE && incoming) {
      let buffer = new Readable(data);
      let length = buffer.uint16();
      let opcode = buffer.uint16();
      let idk = buffer.uint32();
      let xp = buffer.uint64();
      let epLevel = buffer.uint32();
      let idk2 = buffer.uint32();
      let idk3 = buffer.uint32();
      currentXp = xp;
      if (start == 1) {
        startTime = new Date().getTime();
        startXp = currentXp;
        start = 2;
      }
      if (timeout)
        command.message('Time running: ' + (getScriptTime(startTime)) + ' EPXP per minute: ' + Number(Math.round(getXpPerMinute(startXp, startTime))).toLocaleString());
    }
  });

  function getScriptTime(startTime) {
    let ms = new Date().getTime() - startTime;
    let totalSecs = Math.floor(ms / 1000);
    let hours = Math.floor(totalSecs / 3600);
    let mins = Math.floor((totalSecs / 60) % 60);
    let secs = Math.floor(totalSecs % 60);
    let hoursString = (hours == 0) ? "00" : ((hours < 10) ? "0" + hours : "" + hours);
    let minsString = (mins == 0) ? "00" : ((mins < 10) ? "0" + mins : "" + mins);
    let secsString = (secs == 0) ? "00" : ((secs < 10) ? "0" + secs : "" + secs);
    return hoursString + ":" + minsString + ":" + secsString;
  }

  function getXpPerMinute(startXp, startTime) {
    return (currentXp - startXp) / minutesElapsed(startTime);
  }

  function getXpPerHour(startXp, startTime) {
    return (currentXp - startXp) / hoursElapsed(startTime);
  }

  function millisElapsed(startTime) {
    return new Date().getTime() - startTime;
  }

  function secondsElapsed(startTime) {
    return millisElapsed(startTime) / 1000;
  }

  function minutesElapsed(startTime) {
    return secondsElapsed(startTime) / 60;
  }

  function hoursElapsed(startTime) {
    return minutesElapsed(startTime) / 60;
  }

}
