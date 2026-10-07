"use client";

/**
 * CLOOP Sound Alert Engine
 * Sử dụng Web Audio API để phát âm thanh chuông báo chuẩn sàn (Ding-Dong / Chime)
 * Không phụ thuộc file mp3 ngoài, 0ms trễ, âm lượng to rõ ràng.
 */
class SoundAlertEngine {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cloop_cskh_sound_enabled");
      if (saved !== null) {
        this.isSoundEnabled = saved === "true";
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("cloop_cskh_sound_enabled", String(enabled));
    }
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  /**
   * Phát chuông "Ding-Dong" ngân vang hai nốt báo khách hàng gửi tin nhắn
   */
  public playChime() {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Nốt 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Nốt 2: G5 (783.99 Hz) ngân vang hơn
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.14);
      gain2.gain.setValueAtTime(0.45, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.8);

      // Nốt 3: C6 (1046.5 Hz) tạo độ sáng cho chuông
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(1046.5, now + 0.28);
      gain3.gain.setValueAtTime(0.3, now + 0.28);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.28);
      osc3.stop(now + 0.95);
    } catch (e) {
      console.warn("Không thể phát chuông âm thanh:", e);
    }
  }

  /**
   * Phát chuông khẩn cấp (Lặp lại 2 lần để gây chú ý mạnh)
   */
  public playEmergencyAlert() {
    this.playChime();
    setTimeout(() => {
      this.playChime();
    }, 600);
  }

  /**
   * Yêu cầu quyền gửi thông báo Windows / trình duyệt
   */
  public async requestDesktopPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
  }

  /**
   * Gửi thông báo nổi trên màn hình Windows / Mac
   */
  public showDesktopNotification(title: string, body: string, onClick?: () => void) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(title, {
            body,
            icon: "/loogo.png",
            tag: "cloop-cskh",
          });
          if (onClick) {
            notif.onclick = () => {
              window.focus();
              onClick();
            };
          }
        } catch (e) {
          console.warn("Lỗi gửi thông báo desktop:", e);
        }
      }
    }
  }
}

export const soundAlert = new SoundAlertEngine();
