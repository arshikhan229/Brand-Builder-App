import React, { useState } from "react";
import { BrandCampaign, MediumAd } from "../types";
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Maximize2, 
  Eye, 
  Smartphone, 
  FileText, 
  Compass, 
  Sparkles, 
  AlertTriangle 
} from "lucide-react";
import { motion } from "motion/react";

interface CampaignDisplayProps {
  campaign: BrandCampaign;
  onRegenerateMedium: (medium: "billboard" | "newspaper" | "socialPost") => Promise<void>;
}

export const CampaignDisplay: React.FC<CampaignDisplayProps> = ({ campaign, onRegenerateMedium }) => {
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedText((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Direct base64 fallback
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderAdCard = (
    title: string,
    mediumId: "billboard" | "newspaper" | "socialPost",
    ad?: MediumAd,
    aspectClass = "aspect-video"
  ) => {
    if (!ad) return null;

    return (
      <motion.div
        id={`ad-card-${mediumId}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300"
      >
        {/* Card Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mediumId === "billboard" && <Compass className="w-5 h-5 text-indigo-600" />}
            {mediumId === "newspaper" && <FileText className="w-5 h-5 text-amber-600" />}
            {mediumId === "socialPost" && <Smartphone className="w-5 h-5 text-emerald-600" />}
            <span className="font-display font-semibold text-slate-800 text-base">{title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {ad.imageUrl && !ad.loading && (
              <>
                <button
                  id={`btn-maximize-${mediumId}`}
                  onClick={() => setZoomedImage({ url: ad.imageUrl!, title })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Expand Visual"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  id={`btn-download-${mediumId}`}
                  onClick={() => downloadImage(ad.imageUrl!, `${campaign.name.toLowerCase()}_${mediumId}`)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              id={`btn-regenerate-${mediumId}`}
              disabled={ad.loading}
              onClick={() => onRegenerateMedium(mediumId)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-40"
              title="Regenerate this Shot"
            >
              <RefreshCw className={`w-4 h-4 ${ad.loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Card Body - Layout Preview */}
        <div className="p-5 flex flex-col flex-1">
          {/* Image Canvas Container */}
          <div className="relative rounded-xl bg-slate-50 border border-slate-100 overflow-hidden mb-4 flex items-center justify-center min-h-[220px]">
            {ad.loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50/90 z-10">
                <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-medium text-slate-600 animate-pulse text-center">
                  Visualizing with Nano-Banana...
                </p>
                <p className="text-xs text-slate-400 mt-1">Maintaining style consistency</p>
              </div>
            ) : null}

            {ad.error ? (
              <div className="p-6 text-center max-w-sm">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-rose-600">Generation Failed</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">{ad.error}</p>
                <button
                  onClick={() => onRegenerateMedium(mediumId)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Generation
                </button>
              </div>
            ) : ad.imageUrl ? (
              <div className={`relative w-full ${aspectClass} overflow-hidden group`}>
                <img
                  src={ad.imageUrl}
                  alt={`${campaign.name} Ad`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                  <button
                    onClick={() => setZoomedImage({ url: ad.imageUrl!, title })}
                    className="p-2.5 bg-white/90 backdrop-blur-sm text-slate-800 rounded-full hover:bg-white shadow transition-transform scale-90 group-hover:scale-100 flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="w-4 h-4" /> Inspect Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400">
                <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-medium">No visualization generated yet</p>
                <button
                  onClick={() => onRegenerateMedium(mediumId)}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Generate Now
                </button>
              </div>
            )}
          </div>

          {/* Medium Specific Mock Frames */}
          <div className="mt-auto space-y-4">
            {/* Slogan Copy Frame */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ad Copy & Text Elements
                </span>
                <button
                  onClick={() => handleCopy(ad.copy, `${mediumId}-copy`)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition rounded"
                  title="Copy Slogan"
                >
                  {copiedText[`${mediumId}-copy`] ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                "{ad.copy}"
              </p>
            </div>

            {/* Prompt details collapse or debug */}
            {ad.promptUsed && (
              <details className="group/details border border-slate-100 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition list-none">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Image Generation Details
                  </span>
                  <span className="text-xs text-slate-400 transition-transform duration-300 group-open/details:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="p-3 bg-white border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Image Prompt (Nano-Banana)
                  </p>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed font-mono max-h-[120px] overflow-y-auto">
                    {ad.promptUsed}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Aspect Ratio: {mediumId === "billboard" ? "16:9" : mediumId === "newspaper" ? "3:4" : "1:1"}</span>
                    <span className="text-emerald-600 font-semibold">✓ Human-free constraint enforced</span>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8" id="campaign-display-root">
      {/* Visual Blueprint & Guide Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 text-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-400/20 rounded-full text-xs font-semibold text-indigo-400 tracking-wide">
                Campaign Style Blueprint
              </span>
              <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-xs font-semibold text-slate-300">
                {campaign.theme}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              {campaign.name}
            </h2>
            {campaign.tagline && (
              <p className="text-indigo-400 text-lg font-medium font-display leading-snug">
                — {campaign.tagline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:self-center">
            {campaign.colors.map((color, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-700"
              >
                <span
                  className="w-3 h-3 rounded-full border border-slate-600"
                  style={{
                    backgroundColor: color.startsWith("#") ? color : "transparent",
                    borderColor: color.startsWith("#") ? "rgba(255,255,255,0.15)" : "currentColor",
                  }}
                />
                <span>{color}</span>
              </div>
            ))}
          </div>
        </div>

        {campaign.visualBlueprint && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Consistent Product Industrial Design (Blueprint Reference)
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed max-w-4xl bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {campaign.visualBlueprint}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Safety Rule Active: Absolutely no people, human actors, hands, or faces will be generated.
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Grid of Medium Layouts */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold text-slate-800">Ad Space Visualizations</h3>
          <p className="text-xs text-slate-500 font-medium">Generated with Nano-Banana Model</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billboard */}
          <div className="lg:col-span-1">
            {renderAdCard("Billboard (16:9)", "billboard", campaign.billboard, "aspect-video")}
          </div>

          {/* Newspaper */}
          <div className="lg:col-span-1">
            {renderAdCard("Newspaper Ad (3:4)", "newspaper", campaign.newspaper, "aspect-[3/4]")}
          </div>

          {/* Social Post */}
          <div className="lg:col-span-1">
            {renderAdCard("Social Lifestyle (1:1)", "socialPost", campaign.socialPost, "aspect-square")}
          </div>
        </div>
      </div>

      {/* Image Modal Preview */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4">
          <div className="max-w-4xl w-full flex flex-col items-end gap-3">
            <button
              onClick={() => setZoomedImage(null)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition font-semibold text-sm"
            >
              Close Preview [Esc]
            </button>
            <div className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-4">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
            <div className="self-start text-left text-slate-300">
              <p className="font-display font-semibold text-lg text-white">{zoomedImage.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">Human-free product campaign render</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
