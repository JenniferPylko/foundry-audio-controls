 const controls = {}
 const handleDirectory = (directory) => {
    if (!directory instanceof PlaylistDirectory) {
        return
    }
    if (directory.closing) {
        return
    }
    const sounds = Array.from(document.querySelectorAll("#currently-playing .playlist-sounds .sound"))
        .map((element) => ({
            element,
            playlist_sound: game.playlists.get(element.dataset.playlistId).sounds.get(element.dataset.soundId)
        }))
    for (const sound of sounds) {
        if (!controls[sound.element.dataset.soundId]) {
            const newRow = document.createElement("div")
            newRow.classList.add("jenny-controls", "flexrow")
            const seeker = document.createElement("input")
            seeker.type = "range"
            seeker.min = 0
            seeker.step = 0.05
            newRow.appendChild(seeker)
            seeker.value = sound.playlist_sound.sound.currentTime ?? sound.playlist_sound.pausedTime
            seeker.max = sound.playlist_sound.sound.duration ?? sound.playlist_sound.pausedTime
            let updating = false
            seeker.addEventListener("change", async (event) => {
                updating = true
                const was_playing = sound.playlist_sound.playing
                const time = parseFloat(event.target.value)
                await sound.playlist_sound.update({playing: false})
                await sound.playlist_sound.update({pausedTime: time})
                await sound.playlist_sound.update({playing: was_playing})
                updating = false
            })
            const liveUpdate = () => {
                setTimeout(() => {
                    if (sound.playlist_sound.playing && !updating) {
                        seeker.value = sound.playlist_sound.sound.currentTime
                        seeker.max = sound.playlist_sound.sound.duration
                    }
                    if (sound.playlist_sound.pausedTime !== null || sound.playlist_sound.playing) {
                        requestAnimationFrame(liveUpdate)
                    }
                }, 1000)
            }
            liveUpdate()
            controls[sound.element.dataset.soundId] = newRow
        }
        sound.element.appendChild(controls[sound.element.dataset.soundId])
    }
}

Hooks.on("changeSidebarTab", handleDirectory)
Hooks.on("renderPlaylistDirectory", handleDirectory)