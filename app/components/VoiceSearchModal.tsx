"use client";

import React, { useState, useEffect, useRef } from "react";
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

export default function VoiceSearchModal({ isOpen, onClose, onTranscript }: VoiceSearchModalProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-start recording immediately when opened
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
        "Trình duyệt chưa hỗ trợ nhận diện giọng nói trực tiếp. Bạn vui lòng sử dụng Chrome, Safari hoặc gõ tìm kiếm nhé!"
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
          setTimeout(() => {
            handleCompleteSearch(final.trim());
          }, 600);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorStatus("Vui lòng cấp quyền micro trên trình duyệt để tìm kiếm bằng giọng nói.");
        } else if (event.error === "no-speech") {
          // Keep listening or prompt
          setErrorStatus("Chưa nghe rõ câu nói. Bạn hãy thử nói lại lần nữa nhé!");
        } else {
          setErrorStatus("Không thể nhận diện giọng nói lúc này.");
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
      setErrorStatus("Không thể khởi động micro.");
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

  const handleCompleteSearch = (queryText: string) => {
    if (!queryText.trim()) return;
    onClose();
    if (onTranscript) {
      onTranscript(queryText.trim());
    } else {
      router.push(`/shop?search=${encodeURIComponent(queryText.trim())}`);
    }
  };

  const handleRetryListening = () => {
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

  if (!isOpen) return null;

  const currentText = transcript || interimTranscript;

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
              {currentText ? `"${currentText}"` : isListening ? "Đang lắng nghe..." : "Bấm vào sóng âm để nói"}
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
                className="underline font-bold text-amber-950 ml-1 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Shopee-style Animated Waveform Equalizer (Tap to restart if stopped) */}
          <div
            onClick={!isListening ? handleRetryListening : undefined}
            className={`flex items-center justify-center gap-[3px] h-10 px-2 transition-all ${
              !isListening ? "cursor-pointer hover:opacity-80" : ""
            }`}
            title={!isListening ? "Bấm để thu âm lại" : "Đang lắng nghe"}
          >
            {WAVE_PATTERN.map((baseH, idx) => (
              <motion.span
                key={idx}
                animate={
                  isListening
                    ? {
                        height: [
                          `${Math.max(4, baseH * 0.4)}px`,
                          `${Math.max(4, baseH * 1.15)}px`,
                          `${Math.max(4, baseH * 0.3)}px`,
                        ],
                        opacity: [0.8, 1, 0.8],
                      }
                    : { height: "4px", opacity: 0.35 }
                }
                transition={
                  isListening
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
