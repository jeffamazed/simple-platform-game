import { Level, State, Player, Coin, Lava, Monster } from "./js/mainClasses.js";
import { DOMDisplay, elt, CanvasDisplay } from "./js/drawingMethod.js";
import { GAME_LEVELS } from "./js/gameLevels.js";

const livesText = document.getElementById("lives");

function trackKeys(keys) {
	let down = Object.create(null);
	function track(event) {
		if (keys.includes(event.key)) {
			down[event.key] = event.type === "keydown";
			event.preventDefault();
		}
	}
	window.addEventListener("keydown", track);
	window.addEventListener("keyup", track);

	down.unregister = () => {
		window.removeEventListener("keydown", track);
		window.removeEventListener("keyup", track);
	};

	return down;
}

function runAnimation(frameFunc) {
	let lastTime = null;
	function frame(time) {
		if (lastTime !== null) {
			let timeStep = Math.min(time - lastTime, 100) / 1000;
			if (frameFunc(timeStep) === false) return;
		}
		lastTime = time;
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

const DEBOUNCE_DELAY = 100;

function runLevel(level, Display) {
	let display = new Display(document.body, level);

	let state = State.start(level);
	let ending = 2;
	let running = "yes";
	let lastEscTime = 0;

	return new Promise((resolve) => {
		function escHandler(e) {
			if (e.key !== "Escape") return;
			e.preventDefault();

			// debouncing
			const now = Date.now();
			if (now - lastEscTime < DEBOUNCE_DELAY) return;
			lastEscTime = now;

			if (running === "no") {
				running = "yes";
				runAnimation(frame);
			} else if (running === "yes") {
				running = "pausing";
			}
		}

		window.addEventListener("keydown", escHandler);
		const arrowKeys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

		function frame(time) {
			if (running === "pausing") {
				running = "no";
				return false;
			}

			state = state.update(time, arrowKeys);
			display.syncState(state);

			if (state.status === "playing") {
				return true;
			} else if (ending > 0) {
				ending -= time;
				return true;
			} else {
				display.clear();
				window.removeEventListener("keydown", escHandler);
				arrowKeys.unregister();
				resolve(state.status);
				return false;
			}
		}

		runAnimation(frame);
	});
}

async function runGame(plans, Display) {
	let lives = 3;
	for (let level = 0; level < plans.length; ) {
		console.log(`Level ${level + 1}, lives: ${lives}`);
		livesText.textContent = `Lives: ${lives}`;
		let status = await runLevel(new Level(plans[level]), Display);

		if (status === "won") level++;
		else {
			lives--;

			if (lives <= 0) {
				// game over and restart game
				level = 0;
				lives = 3;
				console.log("Game over");
			}
		}
	}

	console.log("You've won!");
}

runGame(GAME_LEVELS, CanvasDisplay);
