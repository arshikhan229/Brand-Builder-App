import React, { useState, useEffect } from "react";
import { BrandCampaign, PresetTheme, PRESET_THEMES, MediumAd } from "./types";
import { CampaignDisplay } from "./components/CampaignDisplay";
import { 
  Sparkles, 
  History, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Lightbulb, 
  Palette, 
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Input fields
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<PresetTheme>(PRESET_THEMES[0]);
  const [customColors, setCustomColors] = useState<string[]>(PRESET_THEMES[0].suggestedColors);
  const [newColorInput, setNewColorInput] = useState("");

  // Campaign management state
  const [currentCampaign, setCurrentCampaign] = useState<BrandCampaign | null>(null);
  const [history, setHistory] = useState<BrandCampaign[]>([]);

  // Orchestrator progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<{
    blueprint: "idle" | "loading" | "success" | "error";
    billboard: "idle" | "loading" | "success" | "error";
    newspaper: "idle" | "loading" | "success" | "error";
    socialPost: "idle" | "loading" | "success" | "error";
  }>({
    blueprint: "idle",
    billboard: "idle",
    newspaper: "idle",
    socialPost: "idle",
  });
  
  const [apiError, setApiError] = useState<string | null>(null);

  // Load history from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("brand_builder_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BrandCampaign[];
        setHistory(parsed);
        if (parsed.length > 0) {
          setCurrentCampaign(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to LocalStorage helper
  const saveToHistory = (updatedHistory: BrandCampaign[]) => {
    setHistory(updatedHistory);
    localStorage.setItem("brand_builder_history", JSON.stringify(updatedHistory));
  };

  // Sync colors when theme changes
  const handleThemeChange = (themeId: string) => {
    const theme = PRESET_THEMES.find((t) => t.id === themeId);
    if (theme) {
      setSelectedTheme(theme);
      setCustomColors(theme.suggestedColors);
    }
  };

  // Color tag actions
  const handleAddColor = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newColorInput.trim();
    if (clean && !customColors.includes(clean)) {
      setCustomColors([...customColors, clean]);
      setNewColorInput("");
    }
  };

  const handleRemoveColor = (index: number) => {
    setCustomColors(customColors.filter((_, i) => i !== index));
  };

  // Quick preset fills for delightful UX
  const handleApplySample = (sampleName: string, sampleDesc: string, themeId: string) => {
    setProductName(sampleName);
    setProductDesc(sampleDesc);
    handleThemeChange(themeId);
  };

  // Orcherstrate brand generation
  const handleGenerateCampaign = async () => {
    if (!productName.trim() || !productDesc.trim()) {
      setApiError("Please provide a product name and description first.");
      return;
    }

    setApiError(null);
    setIsGenerating(true);
    setGenerationSteps({
      blueprint: "loading",
      billboard: "idle",
      newspaper: "idle",
      socialPost: "idle",
    });

    try {
      // 1. Generate Style Blueprint and Copies
      const blueprintRes = await fetch("/api/generate-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          description: productDesc,
          theme: selectedTheme.name,
          colors: customColors,
        }),
      });

      if (!blueprintRes.ok) {
        const errData = await blueprintRes.json();
        throw new Error(errData.error || "Blueprint generation failed.");
      }

      const blueprintData = await blueprintRes.json();
      
      setGenerationSteps(prev => ({ ...prev, blueprint: "success" }));

      // Create campaign skeleton
      const campaignId = Date.now().toString();
      const campaignSkeleton: BrandCampaign = {
        id: campaignId,
        name: productName,
        description: productDesc,
        theme: selectedTheme.name,
        colors: customColors,
        createdAt: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        visualBlueprint: blueprintData.visualBlueprint,
        tagline: blueprintData.tagline,
        billboard: {
          copy: blueprintData.billboard.copy,
          ideas: blueprintData.billboard.ideas,
          loading: true,
        },
        newspaper: {
          copy: blueprintData.newspaper.copy,
          ideas: blueprintData.newspaper.ideas,
          loading: true,
        },
        socialPost: {
          copy: blueprintData.socialPost.copy,
          ideas: blueprintData.socialPost.ideas,
          loading: true,
        },
      };

      setCurrentCampaign(campaignSkeleton);

      // Save initial campaign skeleton to history
      const updatedHistory = [campaignSkeleton, ...history];
      saveToHistory(updatedHistory);

      // Start image generation steps
      setGenerationSteps(prev => ({
        ...prev,
        billboard: "loading",
        newspaper: "loading",
        socialPost: "loading",
      }));

      // 2. Generate Images in parallel
      const imagePromises = [
        // Billboard
        generateSingleMediumImage(campaignSkeleton, "billboard").then((res) => {
          setGenerationSteps((prev) => ({ ...prev, billboard: res ? "success" : "error" }));
        }),
        // Newspaper
        generateSingleMediumImage(campaignSkeleton, "newspaper").then((res) => {
          setGenerationSteps((prev) => ({ ...prev, newspaper: res ? "success" : "error" }));
        }),
        // Social Post
        generateSingleMediumImage(campaignSkeleton, "socialPost").then((res) => {
          setGenerationSteps((prev) => ({ ...prev, socialPost: res ? "success" : "error" }));
        }),
      ];

      await Promise.all(imagePromises);
    } catch (e: any) {
      console.error("Overall campaign generation failed", e);
      setApiError(e.message || "An unexpected error occurred. Verify your API Key configuration.");
      setGenerationSteps({
        blueprint: "error",
        billboard: "error",
        newspaper: "error",
        socialPost: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate single shot helper (shared by overall builder and card regeneration)
  const generateSingleMediumImage = async (
    targetCampaign: BrandCampaign,
    medium: "billboard" | "newspaper" | "socialPost"
  ): Promise<boolean> => {
    try {
      const mediumAd = targetCampaign[medium];
      if (!mediumAd) return false;

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetCampaign.name,
          visualBlueprint: targetCampaign.visualBlueprint,
          medium: medium,
          ideas: mediumAd.ideas,
          theme: targetCampaign.theme,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to generate image for ${medium}`);
      }

      const imgData = await response.json();

      // Update current campaign state
      setCurrentCampaign((prev) => {
        if (!prev || prev.id !== targetCampaign.id) return prev;
        const updated = {
          ...prev,
          [medium]: {
            ...prev[medium]!,
            imageUrl: imgData.imageUrl,
            promptUsed: imgData.prompt,
            loading: false,
            error: undefined,
          },
        };
        // Also update local storage/history list to match
        setHistory((prevHistory) => {
          const newHistory = prevHistory.map((h) => (h.id === targetCampaign.id ? updated : h));
          localStorage.setItem("brand_builder_history", JSON.stringify(newHistory));
          return newHistory;
        });
        return updated;
      });

      return true;
    } catch (error: any) {
      console.error(`Error generating ${medium}:`, error);
      
      setCurrentCampaign((prev) => {
        if (!prev || prev.id !== targetCampaign.id) return prev;
        const updated = {
          ...prev,
          [medium]: {
            ...prev[medium]!,
            loading: false,
            error: error.message || "Visual generation failed",
          },
        };
        // Update local storage
        setHistory((prevHistory) => {
          const newHistory = prevHistory.map((h) => (h.id === targetCampaign.id ? updated : h));
          localStorage.setItem("brand_builder_history", JSON.stringify(newHistory));
          return newHistory;
        });
        return updated;
      });

      return false;
    }
  };

  // Manual single-shot regeneration triggers
  const handleRegenerateMedium = async (medium: "billboard" | "newspaper" | "socialPost") => {
    if (!currentCampaign) return;

    // Set medium to loading
    setCurrentCampaign((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [medium]: {
          ...prev[medium]!,
          loading: true,
          error: undefined,
        },
      };
    });

    await generateSingleMediumImage(currentCampaign, medium);
  };

  // Delete Campaign from history
  const handleDeleteCampaign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((c) => c.id !== id);
    saveToHistory(updated);

    if (currentCampaign?.id === id) {
      setCurrentCampaign(updated.length > 0 ? updated[0] : null);
    }
  };

  // Clear entire cache
  const handleClearAllHistory = () => {
    if (window.confirm("Are you sure you want to delete all saved campaigns?")) {
      saveToHistory([]);
      setCurrentCampaign(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-40" id="app-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight text-slate-900 leading-none">
                Brand Builder
              </h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Product Style & Ad Orchestrator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono font-medium">
              Model: Nano-Banana
            </span>
          </div>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Hand: Campaign Form & History (Col Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Main Campaign Builder Form Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5" id="brand-config-form">
            <div className="flex items-center gap-2 text-slate-800">
              <Layers className="w-4.5 h-4.5 text-indigo-600" />
              <h2 className="font-display font-bold text-sm tracking-wide uppercase text-slate-700">
                Configure Brand & Product
              </h2>
            </div>

            {/* Product Input */}
            <div className="space-y-1.5">
              <label htmlFor="product-name" className="text-xs font-semibold text-slate-600">
                Product Name
              </label>
              <input
                id="product-name"
                type="text"
                placeholder="e.g., Summit Insulated Flask"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            {/* Product Description */}
            <div className="space-y-1.5">
              <label htmlFor="product-desc" className="text-xs font-semibold text-slate-600">
                Description & Key Features
              </label>
              <textarea
                id="product-desc"
                rows={4}
                placeholder="What are the materials, styling cues, textures, and key details? (e.g. Matte finish, bamboo wooden lid, double-walled steel, laser etched geometric mountain logo, luxury vibes)"
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none leading-relaxed"
              />
            </div>

            {/* Vibe Presets Selector */}
            <div className="space-y-1.5">
              <label htmlFor="brand-theme" className="text-xs font-semibold text-slate-600">
                Brand Aesthetic Theme
              </label>
              <select
                id="brand-theme"
                value={selectedTheme.id}
                onChange={(e) => handleThemeChange(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              >
                {PRESET_THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} — {theme.vibe}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal italic">
                {selectedTheme.description}
              </p>
            </div>

            {/* Color Palette Builder */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>Color Palette Tags</span>
                <span className="text-[10px] text-slate-400">Added to visual context</span>
              </label>

              {/* Tag Grid */}
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[42px]">
                {customColors.map((color, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-700 text-xs font-medium border border-slate-100 rounded-lg shadow-sm"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.startsWith("#") ? color : "transparent" }}
                    />
                    <span>{color}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(index)}
                      className="text-slate-400 hover:text-slate-600 font-bold ml-0.5 text-[10px]"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {customColors.length === 0 && (
                  <span className="text-xs text-slate-400 italic self-center pl-1">No colors set</span>
                )}
              </div>

              {/* Tag Add */}
              <form onSubmit={handleAddColor} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g., Matte Slate Gray or #4F46E5"
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  disabled={isGenerating}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>

            {/* Error Display */}
            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">Generation Paused</p>
                  <p className="mt-0.5 leading-normal">{apiError}</p>
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              id="btn-generate-campaign"
              onClick={handleGenerateCampaign}
              disabled={isGenerating || !productName.trim() || !productDesc.trim()}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-display font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Orchestrating Brand...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Brand Campaign</span>
                </>
              )}
            </button>

            {/* Preset Samples Generator helper */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Need Inspiration? Try an idea:
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleApplySample(
                    "Obsidian Smartwatch",
                    "A premium circular smartwatch made of black ceramic and brushed charcoal titanium. Sleek futuristic UI on screen. Placed alongside elegant architectural rocks.",
                    "minimalist_luxury"
                  )}
                  className="text-left text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition truncate"
                >
                  ✨ <strong>Obsidian Smartwatch</strong> (Minimalist Luxury)
                </button>
                <button
                  onClick={() => handleApplySample(
                    "Hydro-Grip Flask",
                    "Eco-friendly bamboo water flask with organic hemp wraps and frosted mint-green recycled materials. Textured organic earth look.",
                    "organic_earthy"
                  )}
                  className="text-left text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition truncate"
                >
                  🌱 <strong>Hydro-Grip Flask</strong> (Organic Earthy)
                </button>
              </div>
            </div>
          </div>

          {/* Saved Brand Campaigns / History List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm" id="campaign-history-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <History className="w-4.5 h-4.5 text-slate-500" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider">
                  Campaign History
                </h3>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {history.map((campaign) => {
                const isActive = currentCampaign?.id === campaign.id;
                return (
                  <div
                    key={campaign.id}
                    onClick={() => setCurrentCampaign(campaign)}
                    className={`group p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                      isActive
                        ? "bg-indigo-50/50 border-indigo-200 text-indigo-900"
                        : "bg-slate-50/60 border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold truncate">{campaign.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-slate-400 font-medium">
                          {campaign.createdAt}
                        </span>
                        <span className="text-[9px] px-1 bg-slate-200/50 text-slate-500 rounded font-semibold">
                          {campaign.theme}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition rounded-lg"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {history.length === 0 && (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-xs">No brand campaigns built yet.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Your builds persist locally!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Hand: Creative Showcase / Output Canvas (Col Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {/* 1. Loading / Progress Orchestrator State */}
            {isGenerating && (
              <motion.div
                key="orchestrating-loading"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[450px]"
              >
                <div className="max-w-md w-full text-center space-y-6">
                  {/* Rotating visual elements */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-xl text-slate-800">
                      Orchestrating Brand Spaces
                    </h3>
                    <p className="text-sm text-slate-500 leading-normal">
                      We are crafting your campaign blueprints and visuals using the Nano-Banana image engine. This takes just a moment...
                    </p>
                  </div>

                  {/* Progress Checklist */}
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Campaign Build Sequence
                    </p>

                    {/* Step 1: Text Blueprint */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">1. Generating Consistent Industrial Blueprint & Copy</span>
                      {generationSteps.blueprint === "loading" && (
                        <span className="text-indigo-600 animate-pulse">Running...</span>
                      )}
                      {generationSteps.blueprint === "success" && (
                        <span className="text-emerald-600 font-bold">✓ Complete</span>
                      )}
                      {generationSteps.blueprint === "idle" && (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </div>

                    {/* Step 2: Billboard */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">2. Rendering Billboard Space (16:9)</span>
                      {generationSteps.billboard === "loading" && (
                        <span className="text-indigo-600 animate-pulse">Rendering...</span>
                      )}
                      {generationSteps.billboard === "success" && (
                        <span className="text-emerald-600 font-bold">✓ Rendered</span>
                      )}
                      {generationSteps.billboard === "error" && (
                        <span className="text-rose-500 font-bold">⚠ Failed</span>
                      )}
                      {generationSteps.billboard === "idle" && (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </div>

                    {/* Step 3: Newspaper */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">3. Rendering Newspaper Ad page (3:4)</span>
                      {generationSteps.newspaper === "loading" && (
                        <span className="text-indigo-600 animate-pulse">Rendering...</span>
                      )}
                      {generationSteps.newspaper === "success" && (
                        <span className="text-emerald-600 font-bold">✓ Rendered</span>
                      )}
                      {generationSteps.newspaper === "error" && (
                        <span className="text-rose-500 font-bold">⚠ Failed</span>
                      )}
                      {generationSteps.newspaper === "idle" && (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </div>

                    {/* Step 4: Social post */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">4. Rendering Social Lifestyle Shot (1:1)</span>
                      {generationSteps.socialPost === "loading" && (
                        <span className="text-indigo-600 animate-pulse">Rendering...</span>
                      )}
                      {generationSteps.socialPost === "success" && (
                        <span className="text-emerald-600 font-bold">✓ Rendered</span>
                      )}
                      {generationSteps.socialPost === "error" && (
                        <span className="text-rose-500 font-bold">⚠ Failed</span>
                      )}
                      {generationSteps.socialPost === "idle" && (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Safety Rule Enforced: Guaranteed human-free scenery.
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. Visual Campaign Showcase */}
            {!isGenerating && currentCampaign && (
              <motion.div
                key={currentCampaign.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CampaignDisplay
                  campaign={currentCampaign}
                  onRegenerateMedium={handleRegenerateMedium}
                />
              </motion.div>
            )}

            {/* 3. Empty/Get Started State */}
            {!isGenerating && !currentCampaign && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[500px]"
              >
                <div className="max-w-md space-y-6">
                  {/* Decorative Stack Graphic */}
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-indigo-50 rounded-full scale-90 border border-indigo-100/30"></div>
                    <div className="absolute inset-0 bg-indigo-100/50 rounded-full scale-75 animate-ping duration-1000"></div>
                    <Sparkles className="relative w-10 h-10 text-indigo-600" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-2xl text-slate-800 tracking-tight">
                      A Brand Visualization Studio
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Enter your product details on the left, select a custom vibe aesthetic, and see your product materialize across highway billboards, vintage newspaper columns, and modern social mockups.
                    </p>
                  </div>

                  {/* Core Constraints & Value Prompts Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700">🧬 High-Fidelity Blueprint</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Gemini plans physical dimensions and material specs first to assure visual style consistency.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700">🚫 Guaranteed Human-Free</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Automatic constraints omit human figures to focus solely on the product.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center items-center gap-1 text-xs font-semibold text-indigo-600 animate-pulse">
                    <span>Configure your product and click 'Generate Brand Campaign' to start</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6 mt-12 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Brand Builder Studio. Built using Google GenAI SDK & Nano-Banana Models.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              No-Humans Policy <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            </span>
            <span className="text-slate-300">|</span>
            <span>Local State Saved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
