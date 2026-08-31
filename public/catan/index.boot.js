
const GODOT_CONFIG = {"args":[],"canvasResizePolicy":2,"emscriptenPoolSize":8,"ensureCrossOriginIsolationHeaders":false,"executable":"index","experimentalVK":false,"fileSizes":{"index.pck":425320,"index.wasm":39514754},"focusCanvas":true,"gdextensionLibs":[],"godotPoolSize":4,"serviceWorker":"index.service.worker.js"};
const GODOT_THREADS_ENABLED = false;
const engine = new Engine(GODOT_CONFIG);

// Etat partage avec le jeu, lu depuis GDScript via JavaScriptBridge.
window.hexland = {
	version: '4fc27f9',
	updateAvailable: false,
	installPromptAvailable: false,
	installOutcome: '',
	offlineReady: false,
};

(function () {
	const loader = document.getElementById('loader');
	const fill = document.getElementById('loader-fill');
	const percent = document.getElementById('loader-percent');
	const errorBox = document.getElementById('loader-error');
	const banner = document.getElementById('update-banner');

	// --- Invite d'installation ---
	// L'evenement est capture mais l'invite n'est PAS affichee tout de suite :
	// le jeu la declenchera lui-meme apres une premiere partie terminee.
	let deferredPrompt = null;
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		deferredPrompt = event;
		window.hexland.installPromptAvailable = true;
	});
	window.hexland.showInstallPrompt = function () {
		if (!deferredPrompt) { return false; }
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then((choice) => {
			window.hexland.installOutcome = choice.outcome;
			window.hexland.installPromptAvailable = false;
			deferredPrompt = null;
		});
		return true;
	};
	window.addEventListener('appinstalled', () => {
		window.hexland.installPromptAvailable = false;
		window.hexland.installOutcome = 'installed';
	});

	// --- Detection de mise a jour ---
	// Une nouvelle version n'est jamais appliquee a chaud : elle attend le prochain
	// lancement, pour ne pas casser une partie en cours.
	document.getElementById('update-reload').addEventListener('click', () => {
		// Un simple rechargement ne suffit pas : le service worker en place continue de
		// servir l'ancienne version tant qu'il n'a pas cede la main. On demande donc au
		// nouveau de prendre le relais — il rechargera lui-meme les pages ouvertes.
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistration().then((registration) => {
				if (registration && registration.waiting) {
					registration.waiting.postMessage('update');
					return;
				}
				window.location.reload();
			}).catch(() => window.location.reload());
			return;
		}
		window.location.reload();
	});
	function watchServiceWorker() {
		if (!('serviceWorker' in navigator)) { return; }
		navigator.serviceWorker.getRegistration().then((registration) => {
			if (!registration) { return; }
			window.hexland.offlineReady = true;
			// Une version peut deja attendre depuis la visite precedente : aucun evenement
			// ne sera alors emis, et l'invite ne serait jamais proposee.
			if (registration.waiting) {
				window.hexland.updateAvailable = true;
				banner.style.display = 'flex';
			}
			registration.addEventListener('updatefound', () => {
				const installing = registration.installing;
				if (!installing) { return; }
				installing.addEventListener('statechange', () => {
					if (installing.state === 'installed' && navigator.serviceWorker.controller) {
						window.hexland.updateAvailable = true;
						banner.style.display = 'flex';
					}
				});
			});
			registration.update().catch(() => {});
		}).catch(() => {});
	}

	// --- Chargement ---
	function showError(message) {
		errorBox.textContent = message;
		errorBox.style.display = 'block';
	}

	const missing = Engine.getMissingFeatures({ threads: GODOT_THREADS_ENABLED });
	if (missing.length !== 0) {
		showError('Ce navigateur ne supporte pas : ' + missing.join(', '));
	} else {
		engine.startGame({
			onProgress: function (current, total) {
				if (current > 0 && total > 0) {
					const ratio = Math.min(1, current / total);
					fill.style.width = (ratio * 100).toFixed(0) + '%';
					percent.textContent = (ratio * 100).toFixed(0) + ' %';
				}
			},
		}).then(() => {
			fill.style.width = '100%';
			percent.textContent = '100 %';
			loader.classList.add('hidden');
			setTimeout(() => loader.remove(), 500);
			watchServiceWorker();
		}, (err) => {
			console.error(err);
			showError(typeof err === 'string' ? err : (err && err.message) || 'Erreur inconnue.');
		});
	}
}());
		