
const GODOT_CONFIG = {"args":[],"canvasResizePolicy":2,"emscriptenPoolSize":8,"ensureCrossOriginIsolationHeaders":false,"executable":"index","experimentalVK":false,"fileSizes":{"index.pck":440376,"index.wasm":39514754},"focusCanvas":true,"gdextensionLibs":[],"godotPoolSize":4,"serviceWorker":"index.service.worker.js"};
const GODOT_THREADS_ENABLED = false;
const engine = new Engine(GODOT_CONFIG);

// Etat partage avec le jeu, lu depuis GDScript via JavaScriptBridge.
window.hexland = {
	version: '0dc8514',
	updateAvailable: false,
	installPromptAvailable: false,
	installOutcome: '',
	offlineReady: false,
	// Marges de securite en pixels CSS, relues a chaque rotation. Voir #safe-probe.
	safeTop: 0,
	safeRight: 0,
	safeBottom: 0,
	safeLeft: 0,
};

// --- Gestes : le jeu les gere, pas le navigateur ---
// Safari iOS ignore deliberement `user-scalable=no` depuis iOS 10. Sans blocage explicite,
// deux doigts sur le plateau zooment la PAGE : le canevas garde sa taille mais la fenetre
// visuelle se decale, ce qui se voit comme une camera qui saute a l'autre bout de la carte
// et une barre d'interface qui remonte sous l'encoche. `preventDefault` n'empeche pas la
// propagation : Godot recoit toujours ses evenements.
(function () {
	const stop = (event) => event.preventDefault();
	// Evenements propres a WebKit, emis pour tout pincement ou toute rotation a deux doigts.
	for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
		document.addEventListener(name, stop, { passive: false });
	}
	document.addEventListener('touchmove', (event) => {
		// Un seul doigt sur le canevas ne fait rien defiler : c'est le multi-touch qui
		// declenche le zoom de page. On bloque aussi le doigt unique sur le canevas, sinon
		// iOS reprend la main des que la page depasse d'un pixel.
		if (event.touches.length > 1 || event.target === canvasElement()) {
			event.preventDefault();
		}
	}, { passive: false });
	// Le double appui rapide zoome lui aussi, sans passer par les evenements `gesture*`.
	let lastTouchEnd = 0;
	document.addEventListener('touchend', (event) => {
		const now = Date.now();
		if (now - lastTouchEnd < 320) {
			event.preventDefault();
		}
		lastTouchEnd = now;
	}, { passive: false });
	document.addEventListener('dblclick', stop, { passive: false });

	// Dernier rempart : si la page defile malgre tout — barre d'adresse qui se replie,
	// banniere de notification, champ qui prend le focus — le canevas, plus haut que la
	// fenetre visible, glisse vers le haut. On voit alors la barre du BAS du jeu en haut de
	// l'ecran et le fond de page en dessous, ce qui se lit comme un plateau disparu.
	const unscroll = () => {
		if (window.scrollX !== 0 || window.scrollY !== 0) {
			window.scrollTo(0, 0);
		}
	};
	window.addEventListener('scroll', unscroll, { passive: true });
	window.addEventListener('resize', unscroll);
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', unscroll);
		window.visualViewport.addEventListener('scroll', unscroll);
	}

	function canvasElement() {
		return document.getElementById('canvas');
	}
})();

// --- Marges de securite ---
(function () {
	const probe = document.getElementById('safe-probe');
	const read = () => {
		if (probe === null) {
			return;
		}
		const style = window.getComputedStyle(probe);
		window.hexland.safeTop = parseFloat(style.paddingTop) || 0;
		window.hexland.safeRight = parseFloat(style.paddingRight) || 0;
		window.hexland.safeBottom = parseFloat(style.paddingBottom) || 0;
		window.hexland.safeLeft = parseFloat(style.paddingLeft) || 0;
	};
	read();
	window.addEventListener('resize', read);
	window.addEventListener('orientationchange', () => window.setTimeout(read, 120));
})();

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
		