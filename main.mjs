const id = "jennys-audio-controls"
// Simple log helper for strings or objects
const log = (arg) => {
    console.info(id, arg)
}
const controls = {}
// V11, V12 has one document structure, V13 has another.
let path;
Hooks.on("init", () => {
    const versionSemVer = game.version;
    const major = parseInt(versionSemVer.substring(0, versionSemVer.indexOf('.')))
    if (major < 13) {
        path = "#currently-playing .playlist-sounds .sound";
    } else {
        path = "#playlists .currently-playing .playlist-sounds .sound";
    }
    log(`Foundry version ${versionSemVer}, path ${path}`)
})
const handleDirectory = async (directory) => {
    if (!(directory instanceof PlaylistDirectory)) {
        return
    }
    const sounds = Array.from(document.querySelectorAll(path))
        .filter(element => element.dataset.playlistId && element.dataset.soundId)
        .map((element) => ({
            element,
            playlist_sound: game.playlists.get(element.dataset.playlistId)?.sounds.get(element.dataset.soundId)
        }))
        .filter(sound => sound.playlist_sound); // Ensure sound exists
    for (const sound of sounds) {
        const soundId = sound.element.dataset.soundId;
        const playlist_sound = sound.playlist_sound;
        if (playlist_sound.streaming) continue; // Skip streaming sounds as they can't be sought
        if (!playlist_sound.sound || !playlist_sound.sound.loaded) {
            await playlist_sound.load(); // Changed to load() for V13 compatibility
        }
        const duration = playlist_sound.sound?.duration ?? playlist_sound.pausedTime ?? 0;
        if (!Number.isFinite(duration) || duration <= 0) continue; // Skip if invalid duration
        if (!controls[soundId]) {
            const newRow = document.createElement("div");
            newRow.classList.add("jenny-controls", "flexrow");
            newRow.style.display = "flex";
            newRow.style.width = "100%";
            newRow.style.marginTop = "5px";
            const seeker = document.createElement("input");
            seeker.type = "range";
            seeker.min = 0;
            seeker.step = 0.05;
            seeker.style.flex = "1";
            seeker.value = playlist_sound.sound?.currentTime ?? playlist_sound.pausedTime ?? 0;
            seeker.max = duration;
            newRow.appendChild(seeker);
            let updating = false;
            seeker.addEventListener("change", async (event) => { // Reverted to "change" to avoid lag during drag; seeks on release
                updating = true;
                const was_playing = playlist_sound.playing;
                const time = parseFloat(event.target.value);
                await playlist_sound.update({ playing: false });
                await playlist_sound.update({ pausedTime: time });
                await playlist_sound.update({ playing: was_playing });
                updating = false;
                // Force refresh to ensure max and timer display correctly
                playlist_sound.synchronize();
            });
            const liveUpdate = () => {
                setTimeout(() => {
                    if (playlist_sound.playing && !updating) {
                        seeker.value = playlist_sound.sound?.currentTime ?? 0;
                        const dur = playlist_sound.sound?.duration ?? seeker.max;
                        if (Number.isFinite(dur) && dur > 0) {
                            seeker.max = dur;
                        }
                    }
                    if (playlist_sound.pausedTime !== null || playlist_sound.playing) {
                        requestAnimationFrame(liveUpdate);
                    }
                }, 1000); // Kept original 1s update interval to reduce CPU usage
            };
            liveUpdate();
            controls[soundId] = newRow;
        }
        if (!sound.element.contains(controls[soundId])) {
            sound.element.appendChild(controls[soundId]);
        }
    }
}

// Hooks for V13 compatibility
Hooks.on("renderPlaylistDirectory", handleDirectory);
Hooks.on("renderSidebarTab", (app) => {
    if (app instanceof PlaylistDirectory) handleDirectory(app);
});
Hooks.on("updatePlaylistSound", (sound, changes) => {
    if (changes.playing !== undefined || changes.pausedTime !== undefined || changes.lapsed !== undefined) {
        handleDirectory(game.playlists.directory);
    }
});
