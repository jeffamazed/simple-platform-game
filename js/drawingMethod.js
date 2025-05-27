const scale = 30;

function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}

class DOMDisplay {
  constructor(parent, level) {
    this.dom = elt("div", { class: "game" }, drawGrid(level));
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }

  clear() {
    this.dom.remove();
  }
}

DOMDisplay.prototype.syncState = function (state) {
  if (this.actorLayer) this.actorLayer.remove();
  this.actorLayer = drawActors(state.actors);
  this.dom.appendChild(this.actorLayer);
  this.dom.className = `game ${state.status}`;
  this.scrollPlayerIntoView(state);
};

DOMDisplay.prototype.scrollPlayerIntoView = function (state) {
  let width = this.dom.clientWidth;
  let height = this.dom.clientHeight;
  let marginX = width / 3;
  let marginY = height / 4;

  // the viewport
  let left = this.dom.scrollLeft,
    right = left + width;
  let top = this.dom.scrollTop,
    bottom = top + height;

  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5)).times(scale);

  if (center.x < left + marginX) {
    this.dom.scrollLeft = center.x - marginX;
  } else if (center.x > right - marginX) {
    this.dom.scrollLeft = center.x + marginX - width;
  }
  if (center.y < top + marginY) {
    this.dom.scrollTop = center.y - marginY;
  } else if (center.y > bottom - marginY) {
    this.dom.scrollTop = center.y + marginY - height;
  }
};

function drawGrid(level) {
  return elt(
    "table",
    {
      class: "background",
      style: `width: ${level.width * scale}px`,
    },
    ...level.rows.map((row) =>
      elt(
        "tr",
        { style: `height: ${scale}px` },
        ...row.map((type) => elt("td", { class: type })),
      ),
    ),
  );
}

function drawActors(actors) {
  return elt(
    "div",
    {},
    ...actors.map((actor) => {
      let rect = elt("div", { class: `actor ${actor.type}` });
      rect.style.width = `${actor.size.x * scale}px`;
      rect.style.height = `${actor.size.y * scale}px`;
      rect.style.left = `${actor.pos.x * scale}px`;
      rect.style.top = `${actor.pos.y * scale}px`;
      return rect;
    }),
  );
}

class CanvasDisplay {
  constructor(parent, level) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.min(800, level.width * scale);
    this.canvas.height = Math.min(600, level.height * scale);
    parent.appendChild(this.canvas);
    this.c = this.canvas.getContext("2d");

    this.flipPlayer = false;

    this.viewport = {
      left: 0,
      top: 0,
      width: this.canvas.width / scale,
      height: this.canvas.height / scale,
    };
  }

  clear() {
    this.canvas.remove();
  }
}

CanvasDisplay.prototype.syncState = function (state) {
  this.updateViewport(state);
  this.clearDisplay(state.status);
  this.drawBackground(state.level);
  this.drawActors(state.actors);
};

CanvasDisplay.prototype.updateViewport = function (state) {
  let view = this.viewport;
  let marginX = view.width / 3;
  let marginY = view.height / 4;
  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5));

  if (center.x < view.left + marginX) {
    view.left = Math.max(center.x - marginX, 0);
  } else if (center.x > view.left + view.width - marginX) {
    view.left = Math.min(
      center.x + marginX - view.width,
      state.level.width - view.width,
    );
  }
  if (center.y < view.top + marginY) {
    view.top = Math.max(center.y - marginY, 0);
  } else if (center.y > view.top + view.height - marginY) {
    view.top = Math.min(
      center.y + marginY - view.height,
      state.level.height - view.height,
    );
  }
};

CanvasDisplay.prototype.clearDisplay = function (status) {
  if (status === "won") {
    this.c.fillStyle = "rgb(68, 191,255)";
  } else if (status === "lost") {
    this.c.fillStyle = "rgb(44, 136,214)";
  } else {
    this.c.fillStyle = "rgb(52, 166, 251)";
  }
  this.c.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

export { elt, DOMDisplay, drawGrid, drawActors, CanvasDisplay };

const otherSprites = new Image();
otherSprites.src = "./img/sprites-final2.png";

CanvasDisplay.prototype.drawBackground = function (level) {
  let { left, top, width, height } = this.viewport;
  let xStart = Math.floor(left);
  let xEnd = Math.ceil(left + width);
  let yStart = Math.floor(top);
  let yEnd = Math.ceil(top + height);

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      let tile = level.rows[y][x];
      if (tile === "empty") continue;
      let screenX = (x - left) * scale;
      let screenY = (y - top) * scale;
      let tileX = tile === "lava" ? scale : 0;
      this.c.drawImage(
        otherSprites,
        tileX,
        0,
        scale,
        scale,
        screenX,
        screenY,
        scale,
        scale,
      );
    }
  }
};

function flipHorizontally(context, around) {
  context.translate(around, 0);
  context.scale(-1, 1);
  context.translate(-around, 0);
}

let playerSprites = new Image();
playerSprites.src = "./img/player-final2.png";
const playerXOverlap = 6;

CanvasDisplay.prototype.drawPlayer = function (player, x, y, width, height) {
  width += playerXOverlap * 2;
  x -= playerXOverlap;
  if (player.speed.x !== 0) {
    this.flipPlayer = player.speed.x < 0;
  }

  let tile = 8;
  if (player.speed.y !== 0) {
    tile = 9;
  } else if (player.speed.x !== 0) {
    tile = Math.floor(Date.now() / 60) % 8;
  }

  this.c.save();
  if (this.flipPlayer) {
    flipHorizontally(this.c, x + width / 2);
  }

  let tileX = tile * width;
  this.c.drawImage(playerSprites, tileX, 0, width, height, x, y, width, height);
  this.c.restore();
};

CanvasDisplay.prototype.drawActors = function (actors) {
  for (let actor of actors) {
    let width = actor.size.x * scale;
    let height = actor.size.y * scale;
    let x = (actor.pos.x - this.viewport.left) * scale;
    let y = (actor.pos.y - this.viewport.top) * scale;

    if (actor.type === "player") {
      this.drawPlayer(actor, x, y, width, height);
    } else {
      let tileX = (actor.type === "coin" ? 2 : 1) * scale;
      this.c.drawImage(
        otherSprites,
        tileX,
        0,
        width,
        height,
        x,
        y,
        width,
        height,
      );
    }
  }
};
