"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  SendHorizonal,
  Loader2,
  UploadCloud,
  Trash2,
  Sun,
  Moon,
  Mic,
} from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "bot";
  content: string;
}

const LOCAL_STORAGE_KEY = "nova_chat_history";

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [parsedPdfText, setParsedPdfText] = useState<string>("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isListening, setIsListening] = useState<boolean>(false);
  const pdfjsLibRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_KEY = "AIzaSyD0nbmuMuvP3xOt34OOhc3OQyewj74H3m8";

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      : null;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    document.body.className =
      theme === "dark" ? "bg-zinc-900 text-zinc-100" : "bg-white text-black";
  }, [theme]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      pdfjsLibRef.current = (window as any)["pdfjsLib"];
      pdfjsLibRef.current.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfUploaded(true);
    setPdfFileName(file.name);

    const fileMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: `📄 Uploaded file: ${file.name}`,
    };
    setMessages((prev) => [...prev, fileMessage]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLibRef.current.getDocument({ data: typedArray })
          .promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str || "");
          fullText += strings.join(" ") + "\n";
        }

        setParsedPdfText(fullText.trim());
      } catch (err) {
        console.error("Error parsing PDF:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
    setPdfUploaded(false);
    setPdfFileName("");
    setParsedPdfText("");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: userInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const lowerInput = userInput.toLowerCase();
    const isNameQuestion = [
      "what is your name",
      "who are you",
      "tell me your name",
      "may i know your name",
      "your name",
      "name?",
    ].some((phrase) => lowerInput.includes(phrase));

    if (isNameQuestion) {
      const botReply: Message = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        sender: "bot",
        content: "🤖 My name is NoVa — your AI assistant!",
      };
      setMessages((prev) => [...prev, botReply]);
      setIsLoading(false);
      return;
    }

    try {
      const combinedContent = parsedPdfText
        ? `${userInput}\n\n[Attached PDF Content]:\n${parsedPdfText}`
        : userInput;

      const fullMessageHistory = [...messages, userMessage].map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      fullMessageHistory[fullMessageHistory.length - 1].parts[0].text =
        combinedContent;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: fullMessageHistory,
            generationConfig: { responseMimeType: "text/plain" },
          }),
        }
      );

      const data = await response.json();
      const botText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.error?.message ||
        "Error fetching response.";

      const botReply: Message = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        sender: "bot",
        content: botText,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          sender: "bot",
          content: "❌ Sorry, an error occurred while fetching the response.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (!recognition)
      return alert("Speech recognition is not supported in this browser.");

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.start();
      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`w-full h-screen flex flex-col ${
        isDark ? "bg-zinc-900 text-zinc-100" : "bg-white text-black"
      }`}
    >
      <header
        className={`py-3 shadow-md w-full px-4 flex justify-between items-center ${
          isDark ? "bg-zinc-800" : "bg-gray-200"
        }`}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NoVa</h1>
          <p
            className={`text-xs ${
              isDark ? "text-zinc-300" : "text-gray-600"
            }`}
          >
            Your AI Chat Assistant
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className={isDark ? "text-zinc-100" : "text-black"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex-1 relative w-full max-w-4xl mx-auto">
        <div
          ref={scrollRef}
          className="overflow-y-auto px-4 py-6 space-y-2 h-[calc(100vh-180px)]"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`max-w-[70%] px-4 py-2 rounded-2xl shadow break-words whitespace-pre-line ${
                msg.sender === "user"
                  ? isDark
                    ? "ml-auto text-zinc-100 bg-zinc-700"
                    : "ml-auto text-black bg-gray-100"
                  : isDark
                  ? "mr-auto text-zinc-100 bg-zinc-600"
                  : "mr-auto text-black bg-gray-300"
              }`}
            >
              {msg.content}
            </motion.div>
          ))}
          {isLoading && (
            <div
              className={`mr-auto px-4 py-2 rounded-2xl shadow animate-pulse ${
                isDark ? "bg-zinc-600 text-zinc-100" : "bg-gray-300 text-black"
              }`}
            >
              Typing...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className={`fixed bottom-0 left-0 right-0 w-full max-w-4xl mx-auto p-3 flex flex-col sm:flex-row gap-2 border-t ${
            isDark ? "bg-zinc-800 border-zinc-700" : "bg-gray-100 border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                isDark ? "bg-zinc-100 hover:bg-zinc-200 text-black" : "bg-transparent text-black"
              }`}
              title="Upload PDF"
            >
              <UploadCloud className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Upload</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePDFUpload}
              style={{ display: "none" }}
            />

            <Button
              type="button"
              onClick={handleMicClick}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                isDark ? "bg-zinc-100 hover:bg-zinc-200 text-black" : "bg-transparent text-black"
              }`}
              title="Toggle Microphone"
            >
              <Mic
                className={`w-5 h-5 ${
                  isListening ? "animate-pulse text-red-500" : ""
                }`}
              />
              <span className="hidden sm:inline text-sm">
                {isListening ? "Listening..." : "Mic"}
              </span>
            </Button>
          </div>

          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className={`flex-1 resize-none border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
              isDark
                ? "bg-zinc-900 text-zinc-100 border-zinc-600 focus:ring-zinc-300"
                : "bg-white text-black border-gray-400 focus:ring-black"
            }`}
            style={{ minHeight: "40px", maxHeight: "150px", overflowY: "auto" }}
          />

          <div className="flex gap-2 items-center">
            <Button
              type="submit"
              className={`${
                isDark
                  ? "bg-zinc-100 hover:bg-zinc-200 text-black"
                  : "bg-black hover:bg-gray-800 text-white"
              }`}
              disabled={isLoading}
              title="Send Message"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizonal className="h-5 w-5" />
              )}
            </Button>

            <Button
              type="button"
              onClick={handleClearChat}
              className={`px-4 py-2 rounded-md ${
                isDark
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-transparent text-red-600 hover:text-red-700"
              }`}
              title="Clear Chat"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
