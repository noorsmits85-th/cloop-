"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript?: (text: string) => void;
}

const SAMPLE_PHRASES = [
  "Đầm dạ hội tiệc cưới",
  "Áo dài cách tân",
  "Set blazer dạ tweed",
  "Váy hoa nhí dạo phố",
];

// Wave heights pattern similar to Shopee
const WAVE_PATTERN = [
  4, 6, 8, 12, 18, 26, 32, 28, 20, 14, 18, 28, 36, 30, 22, 16, 24, 34, 38, 30, 20, 14, 18, 26, 20, 12, 8, 6, 4
];

const PERMISSION_MSG = "Micro đang bị chặn. Bấm biểu tượng ổ khoá trên thanh địa chỉ → Quyền → bật Micro, rồi bấm Thử lại.";
const MAX_RECORD_MS = 7000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function VoiceSearchModal({ isOpen, onClose, onTranscript }: VoiceSearchModalProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);
  const closedRef = useRef(true);
  // Khi Web Speech API không dùng được (WebView Facebook/Zalo, lỗi dịch vụ) -> nhớ để lần sau ghi âm luôn
  const useRecorderRef = useRef(false);

  // Giữ props mới nhất để callback trong recognition không bị "stale closure"
  const propsRef = useRef({ onClose, onTranscript, router });
  propsRef.current = { onClose, onTranscript, router };

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const stopEverything = useCallback(() => {
    clearTimers();
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {
      // ignore
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const handleCompleteSearch = useCallback((queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    closedRef.current = true;
    const { onClose: close, onTranscript: emit, router: r } = propsRef.current;
    close();
    if (emit) {
      emit(q);
    } else {
      r.push(`/shop?search=${encodeURIComponent(q)}`);
    }
  }, []);

  // ---------- Chế độ 2: Ghi âm + chép lời trên server (cho trình duyệt không có Web Speech API) ----------
  const startRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorStatus("Trình duyệt này chưa hỗ trợ ghi âm. Hãy mở bằng Chrome/Safari hoặc gõ tìm kiếm nhé!");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err: any) {
      setIsListening(false);
      setErrorStatus(
        err?.name === "NotAllowedError" || err?.name === "SecurityError"
          ? PERMISSION_MSG
          : "Không tìm thấy micro trên thiết bị."
      );
      return;
    }
    if (closedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;

    const mimeType =
      ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (t) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t)
      ) || "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    let heardSpeech = false;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      clearTimers();
      stream.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setIsListening(false);
      if (closedRef.current) return;

      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (!heardSpeech || blob.size < 1500) {
        setErrorStatus("Chưa nghe rõ câu nói. Bạn chạm vào sóng âm và nói lại nhé!");
        return;
      }

      setIsTranscribing(true);
      try {
        const res = await fetch("/api/voice-transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: await blobToBase64(blob), mimeType: blob.type }),
        });
        const data = await res.json().catch(() => ({}));
        if (closedRef.current) return;
        if (res.ok && data?.success && data.text) {
          setTranscript(data.text);
          timersRef.current.push(window.setTimeout(() => handleCompleteSearch(data.text), 450));
        } else {
          setErrorStatus(data?.message || "Chưa nghe rõ câu nói. Bạn thử nói lại nhé!");
        }
      } catch {
        if (!closedRef.current) setErrorStatus("Mạng chập chờn, chưa gửi được giọng nói. Thử lại nhé!");
      } finally {
        setIsTranscribing(false);
      }
    };

    // Tự dừng khi người dùng ngừng nói (~1.2s im lặng) giống Shopee
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let lastLoud = Date.now();
      const tick = () => {
        if (recorder.state !== "recording") return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.04) {
          heardSpeech = true;
          lastLoud = Date.now();
        }
        if (heardSpeech && Date.now() - lastLoud > 1200) {
          recorder.stop();
          return;
        }
        timersRef.current.push(window.setTimeout(tick, 100));
      };
      tick();
    } catch {
      heardSpeech = true; // không đo được âm lượng -> vẫn gửi đoạn ghi âm
    }

    recorder.start(250);
    setIsListening(true);
    setErrorStatus(null);
    timersRef.current.push(
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORD_MS)
    );
  }, [handleCompleteSearch]);

  // ---------- Chế độ 1: Web Speech API gốc của trình duyệt (nhanh nhất, chữ hiện ngay khi nói) ----------
  const startListening = useCallback(() => {
    stopEverything();
    setErrorStatus(null);
    setTranscript("");
    setInterimTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || useRecorderRef.current) {
      void startRecorder();
      return;
    }

    let finished = false;
    try {
      // Tạo đối tượng mới mỗi lần: dùng lại instance cũ hay lỗi trên Chrome Android
      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorStatus(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) final += item[0].transcript;
          else interim += item[0].transcript;
        }
        if (final.trim() && !finished) {
          finished = true;
          const text = final.trim();
          setTranscript(text);
          setInterimTranscript("");
          timersRef.current.push(window.setTimeout(() => handleCompleteSearch(text), 450));
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (closedRef.current || event.error === "aborted") return;

        if (event.error === "no-speech") {
          setErrorStatus("Chưa nghe rõ câu nói. Bạn chạm vào sóng âm và nói lại nhé!");
          return;
        }
        // not-allowed / service-not-allowed / network / audio-capture...:
        // WebView trong app (Facebook, Zalo...) hay chặn dịch vụ nhận diện dù đã cấp quyền micro.
        // -> Chuyển sang ghi âm trực tiếp + chép lời trên server. Nếu micro thật sự bị chặn, startRecorder sẽ báo rõ.
        finished = true;
        useRecorderRef.current = true;
        recognitionRef.current = null;
        void startRecorder();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Init speech recognition failed:", err);
      useRecorderRef.current = true;
      void startRecorder();
    }
  }, [handleCompleteSearch, startRecorder, stopEverything]);

  // Auto-start recording immediately when opened
  useEffect(() => {
    if (!isOpen) return;
    closedRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setErrorStatus(null);
    setIsTranscribing(false);
    startListening();

    return () => {
      closedRef.current = true;
      stopEverything();
      setIsListening(false);
    };
  }, [isOpen, startListening, stopEverything]);

  const handleRetryListening = () => {
    if (isTranscribing) return;
    startListening();
  };

  // Chạm vào sóng âm: đang ghi âm (chế độ 2) -> dừng & gửi ngay; đang dừng -> nghe lại
  const handleWaveTap = () => {
    if (isListening) {
      if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
      return;
    }
    handleRetryListening();
  };

  if (!isOpen) return null;

  const currentText = transcript || interimTranscript;
  const heading = currentText
    ? `"${currentText}"`
    : isTranscribing
    ? "Đang nhận diện..."
    : isListening
    ? "Đang lắng nghe..."
    : "Bấm vào sóng âm để nói";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex flex-col justify-end bg-black/60 backdrop-blur-xs">
        {/* Backdrop click to dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Shopee-style Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg mx-auto bg-white rounded-t-[32px] pt-6 pb-9 px-6 text-center shadow-2xl z-10 overflow-hidden"
        >
          {/* Close button in top right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Heading */}
          <div className="mt-2 mb-4">
            <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight transition-all">
              {heading}
            </h3>
          </div>

          {/* Subtitle */}
          <p className="text-xs font-semibold text-stone-400 mb-3 uppercase tracking-wider">
            Bạn hãy thử nói
          </p>

          {/* Sample Phrases List */}
          <div className="space-y-2 mb-8">
            {SAMPLE_PHRASES.map((phrase, idx) => (
              <p
                key={idx}
                onClick={() => handleCompleteSearch(phrase)}
                className="text-[13px] text-stone-700 font-medium cursor-pointer hover:text-[#EE4D2D] hover:font-bold transition-colors select-none py-0.5"
              >
                {phrase}
              </p>
            ))}
          </div>

          {/* Error notice if microphone failed */}
          {errorStatus && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-700" />
              <span>{errorStatus}</span>
              <button
                type="button"
                onClick={handleRetryListening}
                className="underline font-bold text-amber-950 ml-1 cursor-pointer shrink-0"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Shopee-style Animated Waveform Equalizer (tap to restart / finish early) */}
          <div
            onClick={handleWaveTap}
            className="flex items-center justify-center gap-[3px] h-10 px-2 transition-all cursor-pointer hover:opacity-80"
            title={isListening ? "Chạm để kết thúc" : "Chạm để nói"}
          >
            {WAVE_PATTERN.map((baseH, idx) => (
              <motion.span
                key={idx}
                animate={
                  isListening || isTranscribing
                    ? {
                        height: [
                          `${Math.max(4, baseH * 0.4)}px`,
                          `${Math.max(4, baseH * (isTranscribing ? 0.6 : 1.15))}px`,
                          `${Math.max(4, baseH * 0.3)}px`,
                        ],
                        opacity: [0.8, 1, 0.8],
                      }
                    : { height: "4px", opacity: 0.35 }
                }
                transition={
                  isListening || isTranscribing
                    ? {
                        repeat: Infinity,
                        duration: 0.8 + (idx % 5) * 0.12,
                        ease: "easeInOut",
                        delay: (idx % 7) * 0.08,
                      }
                    : { duration: 0.3 }
                }
                className="w-[3px] rounded-full bg-gradient-to-t from-[#EE4D2D] to-[#FF7337]"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
