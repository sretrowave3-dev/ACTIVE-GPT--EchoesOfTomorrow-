<<<<<<< HEAD
class CinematicBaker {
    constructor(canvas, fps = 60, videoBitrate = 8000000) {
        this.canvas = canvas;
        this.fps = fps;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.options = { 
            mimeType: 'video/webm; codecs=vp9', 
            videoBitsPerSecond: videoBitrate 
        };
    }

    startRecording() {
        this.recordedChunks = [];
        const stream = this.canvas.captureStream(this.fps);
        
        try {
            this.mediaRecorder = new MediaRecorder(stream, this.options);
        } catch (e) {
            console.error("MediaRecorder error:", e);
            return;
        }

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => this.downloadBakedCinematic();
        this.mediaRecorder.start();
        console.log("🎥 Cinematic Baking Started...");
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
            console.log("🎥 Cinematic Baking Stopped. Processing file...");
        }
    }

    downloadBakedCinematic() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `cutscene_baked_${Date.now()}.webm`; 
        a.click();
        window.URL.revokeObjectURL(url);
        console.log("✅ Cinematic successfully baked and saved locally.");
    }
=======
class CinematicBaker {
    constructor(canvas, fps = 60, videoBitrate = 8000000) {
        this.canvas = canvas;
        this.fps = fps;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.options = { 
            mimeType: 'video/webm; codecs=vp9', 
            videoBitsPerSecond: videoBitrate 
        };
    }

    startRecording() {
        this.recordedChunks = [];
        const stream = this.canvas.captureStream(this.fps);
        
        try {
            this.mediaRecorder = new MediaRecorder(stream, this.options);
        } catch (e) {
            console.error("MediaRecorder error:", e);
            return;
        }

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => this.downloadBakedCinematic();
        this.mediaRecorder.start();
        console.log("🎥 Cinematic Baking Started...");
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
            console.log("🎥 Cinematic Baking Stopped. Processing file...");
        }
    }

    downloadBakedCinematic() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `cutscene_baked_${Date.now()}.webm`; 
        a.click();
        window.URL.revokeObjectURL(url);
        console.log("✅ Cinematic successfully baked and saved locally.");
    }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}