"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, ArrowRight, Sparkles, Volume2, Search, AlertCircle } from "lucide-react";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript?: (text: string) => void;
}

export default function VoiceSearchModal({ isOpen, onClose, onTranscript }: VoiceSearchModalProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition on open
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setTranscript("");
      setInterimTranscript("");
      setErrorStatus(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorStatus(
        "Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Bạn có thể sử dụng Chrome, Safari hoặc gõ tìm kiếm thông thường nhé!"
      );
      return;
    }

    try {
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
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          setTranscript(final.trim());
          setInterimTranscript("");
          // Auto submit after a brief pause
          setTimeout(() => {
            handleCompleteSearch(final.trim());
          }, 800);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorStatus("Quyền truy cập micro đã bị từ chối. Vui lòng bật cấp quyền micro trên trình duyệt.");
        } else if (event.error === "no-speech") {
          setErrorStatus("Chưa nghe thấy giọng nói. Hãy bấm nút micro và thử nói lại lần nữa nhé!");
        } else {
          setErrorStatus("Không thể nhận diện giọng nói lúc này. Vui lòng thử lại.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Init speech recognition failed:", err);
      setErrorStatus("Không thể khởi động micro. Vui lòng thử lại.");
      setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  const handleRestart = () => {
    setErrorStatus(null);
    setTranscript("");
    setInterimTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // ignore
      }
    }
  };

  const handleCompleteSearch = (queryText: string) => {
    if (!queryText.trim()) return;
    onClose();
    if (onTranscript) {
      onTranscript(queryText.trim());
    } else {
      router.push(`/shop?search=${encodeURIComponent(queryText.trim())}`);
    }
  };

  if (!isOpen) return null;

  const currentDisplay = transcript || interimTranscript;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-md bg-stone-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 text-white shadow-2xl text-center z-10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10.5px] font-bold uppercase tracking-widest mb-5 font-ui">
            <Volume2 size={13} className="animate-pulse" />
            <span>Voice Fashion Search (0đ)</span>
          </div>

          <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Tìm đồ bằng giọng nói
          </h3>
          <p className="text-xs text-stone-400 mb-6 max-w-xs mx-auto">
            Hãy nói tên trang phục, màu sắc hoặc dịp bạn muốn mặc (ví dụ: &quot;Đầm dạ hội đỏ&quot;, &quot;Áo dài cách tân&quot;...)
          </p>

          {/* Animated Microphone Circle */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center my-4">
            {isListening && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-emerald-500/30 border border-emerald-400/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.3, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-2 rounded-full bg-emerald-500/40"
                />
              </>
            )}

            <button
              onClick={isListening ? () => recognitionRef.current?.stop() : handleRestart}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                isListening
                  ? "bg-emerald-500 text-stone-950 shadow-emerald-500/40 scale-105"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {isListening ? (
                <Mic size={34} className="animate-pulse" />
              ) : (
                <MicOff size={32} />
              )}
            </button>
          </div>

          {/* Dynamic Audio Visualizer Bars */}
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 h-6 mb-4">
              {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9, 0.4].map((delay, idx) => (
                <motion.span
                  key={idx}
                  animate={{ height: ["4px", "22px", "4px"] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: delay * 0.3, ease: "easeInOut" }}
                  className="w-1 bg-emerald-400 rounded-full"
                />
              ))}
            </div>
          )}

          {/* Live Transcript Box */}
          <div className="min-h-[56px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 mb-4 flex items-center justify-center text-center">
            {currentDisplay ? (
              <p className="text-sm font-semibold text-emerald-300 italic">
                &quot;{currentDisplay}&quot;
              </p>
            ) : isListening ? (
              <p className="text-xs text-stone-400 animate-pulse">
                Đang lắng nghe giọng nói của bạn...
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                Bấm vào biểu tượng micro để nói
              </p>
            )}
          </div>

          {/* Error message */}
          {errorStatus && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-2 text-left">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{errorStatus}</span>
            </div>
          )}

          {/* Action Button */}
          {transcript ? (
            <button
              onClick={() => handleCompleteSearch(transcript)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-ui text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search size={15} /> Tìm kiếm ngay
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {[
                "Đầm dạ tiệc",
                "Áo blazer",
                "Áo dài cách tân",
                "Set đồ vintage",
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCompleteSearch(sample)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10.5px] text-stone-300 transition-colors cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
