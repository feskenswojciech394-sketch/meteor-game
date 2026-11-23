const arrows = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const STICK_DEAD_ZONE = 0.12;
const STICK_RESPONSE_MS = 40;

export class GameUI {
  constructor(map, dialogues) {
    this.map = map;
    this.dialogues = dialogues;
    this.keys = new Set();
    this.stick = { x: 0, y: 0, analog: true };
    this.stickTarget = { x: 0, y: 0 };
    this.completed = new Set();
    this.talk = document.getElementById('conversation');
    this.pause = document.getElementById('paused');
    this.interact = document.getElementById('interact');
    this.hint = document.getElementById('talk-hint');
    this.objective = document.getElementById('objective');
    this.activePointer = null;
    this.nearby = null;

    for (const [id, value] of Object.entries({
      'map-name': map.name, chapter: map.chapter, day: map.day, 'time-label': map.time
    })) document.getElementById(id).textContent = value;
    this.setArea(map.defaultArea);
    this.refreshObjective();
    this.setNearby(null);
    this.bindJoystick();
    this.bindKeys();

    this.interact.addEventListener('click', () => this.startTalk());
    document.getElementById('next').addEventListener('click', () => this.advance());
    document.getElementById('close-talk').addEventListener('click', () => this.talk.close());
    document.getElementById('pause').addEventListener('click', () => this.openPause());
    document.getElementById('resume').addEventListener('click', () => this.pause.close());
    window.addEventListener('blur', () => this.resetInput());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetInput();
    });
  }

  bindKeys() {
    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (arrows.has(event.code) && !this.blocked) {
        event.preventDefault();
        this.keys.add(event.code);
      }
      if (!['KeyE', 'Escape'].includes(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'KeyE') {
        if (this.talk.open) this.advance();
        else if (!this.pause.open) this.startTalk();
      } else if (this.talk.open) this.talk.close();
      else if (this.pause.open) this.pause.close();
      else this.openPause();
    });
    window.addEventListener('keyup', event => {
      if (this.keys.delete(event.code) && this.activePointer === null && !this.keyboardDirection()) this.onStop?.();
    });
  }

  bindJoystick() {
    this.pad = document.getElementById('joystick');
    this.knob = document.getElementById('stick');
    const move = event => {
      if (event.pointerId !== this.activePointer) return;
      const bounds = this.pad.getBoundingClientRect();
      const radius = bounds.width * .33;
      const x = (event.clientX - bounds.left - bounds.width/2) / radius;
      const y = (event.clientY - bounds.top - bounds.height/2) / radius;
      const distance = Math.hypot(x, y);
      const magnitude = Math.min(distance, 1);
      const strength = Math.max(0, (magnitude - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));
      const ux = distance ? x / distance : 0;
      const uy = distance ? y / distance : 0;
      this.stickTarget.x = ux * strength;
      this.stickTarget.y = uy * strength;
      // The knob follows the finger directly. Only movement input is filtered.
      this.knob.style.transform = 'translate(' + ux*magnitude*radius + 'px,' + uy*magnitude*radius + 'px)';
    };
    this.pad.addEventListener('pointerdown', event => {
      if (this.blocked || this.activePointer !== null || event.button !== 0) return;
      event.preventDefault();
      this.activePointer = event.pointerId;
      this.pad.setPointerCapture(event.pointerId);
      move(event);
    });
    this.pad.addEventListener('pointermove', move);
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      this.pad.addEventListener(name, event => {
        if (event.pointerId === this.activePointer) this.releaseStick();
      });
    }
  }

  releaseStick() {
    const id = this.activePointer;
    this.activePointer = null;
    if (id !== null && this.pad.hasPointerCapture(id)) this.pad.releasePointerCapture(id);
    this.stick.x = this.stick.y = 0;
    this.stickTarget.x = this.stickTarget.y = 0;
    this.knob.style.transform = '';
    if (!this.keyboardDirection()) this.onStop?.();
  }

  resetInput() {
    this.keys.clear();
    this.releaseStick();
  }

  get blocked() { return this.talk.open || this.pause.open; }

  keyboardDirection() {
    const x = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
    if (!x && !y) return null;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  direction(deltaMs) {
    if (this.blocked) return { x: 0, y: 0 };
    if (this.stickTarget.x === 0 && this.stickTarget.y === 0) {
      this.stick.x = this.stick.y = 0;
    } else {
      const mix = -Math.expm1(-deltaMs / STICK_RESPONSE_MS);
      this.stick.x += (this.stickTarget.x - this.stick.x) * mix;
      this.stick.y += (this.stickTarget.y - this.stick.y) * mix;
    }
    return this.keyboardDirection() ?? this.stick;
  }

  setArea(name) {
    if (this.area === name) return;
    this.area = name;
    document.getElementById('location').textContent = name;
  }

  setNearby(npc) {
    this.nearby = npc;
    this.interact.disabled = !npc;
    const target = this.map.npcs.find(person => person.id === this.map.objective?.npc);
    this.hint.textContent = npc ? '可以和' + npc.name + '交谈' : target ? '走近' + target.name + '即可交谈' : '走近镇民即可交谈';
  }

  refreshObjective() {
    const goal = this.map.objective;
    this.objective.hidden = !goal;
    if (!goal) return;
    const done = this.completed.has(goal.npc);
    document.getElementById('objective-label').textContent = done ? '交谈完成' : '当前目标';
    document.getElementById('objective-text').textContent = done ? goal.done : goal.text;
  }

  openPause() {
    if (this.blocked) return;
    this.resetInput();
    this.pause.showModal();
    document.getElementById('resume').focus({preventScroll:true});
  }

  startTalk() {
    if (this.blocked || !this.nearby) return;
    this.resetInput();
    this.speaker = this.nearby;
    this.page = 0;
    document.getElementById('speaker').textContent = this.speaker.name;
    this.showLine();
    this.talk.showModal();
    document.getElementById('next').focus({preventScroll:true});
  }

  showLine() {
    const lines = this.dialogues[this.speaker.dialogue];
    document.getElementById('line').textContent = lines[this.page];
    document.getElementById('line-count').textContent = (this.page+1) + ' / ' + lines.length;
    document.getElementById('next').textContent = this.page === lines.length-1 ? '结束交谈' : '继续';
  }

  advance() {
    if (!this.talk.open) return;
    this.page++;
    if (this.page < this.dialogues[this.speaker.dialogue].length) this.showLine();
    else {
      this.completed.add(this.speaker.id);
      this.refreshObjective();
      this.talk.close();
    }
  }
}
