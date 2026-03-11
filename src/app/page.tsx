"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Send, Zap, Database, ArrowRight, Loader2, Sparkles, LayoutDashboard } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ generatedContent?: string; mockMCPStatus?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, notionPageId, imageBase64: image }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Failed to connect to Nexus engine." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-600 to-blue-500 p-1.5 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">NexusForge</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Database className="w-4 h-4"/> Notion MCP Connected</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400"/> Gemini 3.1 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column - Input Form */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-3">
              Multimodal Agent <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Workspace
              </span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload an image (like an architecture diagram or whiteboard sketch) and let Gemini 3.1 analyze it. NexusForge automatically pushes the generated structures into your Notion via MCP.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-2xl shrink-0">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Target Notion Page ID</label>
              <input 
                type="text" 
                placeholder="e.g. 15d3a3c9b7e..." 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                value={notionPageId}
                onChange={(e) => setNotionPageId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Vision payload (Optional)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                {image ? (
                  <img src={image} alt="Preview" className="h-32 object-cover rounded-lg shadow-md" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-gray-500 group-hover:text-purple-400 mb-2 transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Click to upload image</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Agent Instructions</label>
              <textarea 
                placeholder="Describe what the agent should do with this data..." 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all leading-relaxed"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !prompt}
              className="w-full bg-white text-black font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Run MCP Agent</>}
            </button>
          </form>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7">
          <div className="bg-black/40 border border-white/10 rounded-2xl h-full min-h-[600px] overflow-hidden flex flex-col relative shadow-2xl">
            <div className="border-b border-white/10 bg-black/40 px-4 py-3 flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Agent Execution Log</span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {!result && !loading && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-500"
                  >
                    <FileText className="w-12 h-12 opacity-20" />
                    <p className="text-sm max-w-sm">Ready to execute. Upload a visual asset and provide instructions to see the multimodal Notion MCP pipeline in action.</p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 text-sm text-purple-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting to Gemini-3-Flash-Preview...
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {result.mockMCPStatus && (
                      <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2"><Database className="w-4 h-4" /> {result.mockMCPStatus}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}

                    {result.generatedContent && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" /> Extracted Structure
                        </h3>
                        <div className="bg-[#0a0a0a] rounded-xl p-5 border border-white/5 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap shadow-inner overflow-x-auto">
                          {result.generatedContent}
                        </div>
                      </div>
                    )}

                    {result.error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                        {result.error}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
