/**
 * Audio recording utilities using MediaRecorder API
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder with webm format
      const options = { mimeType: "audio/webm" };
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.audioChunks = [];

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw new Error("Microphone access denied or unavailable");
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /**
   * Cancel recording without returning data
   */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.audioChunks = [];
  }
}

/**
 * Play base64-encoded audio
 */
export function playAudioBase64(base64Audio: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });

      // Create audio element
      const audio = new Audio(URL.createObjectURL(blob));

      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audio.src);
        reject(error);
      };

      audio.play();
    } catch (error) {
      reject(error);
    }
  });
}

