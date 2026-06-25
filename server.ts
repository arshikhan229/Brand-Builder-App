import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

app.use(express.json({ limit: "10mb" }));

// Helper to check API configuration
function checkApiKey(res: express.Response): boolean {
  if (!apiKey || !ai) {
    res.status(500).json({
      error: "Gemini API key is not configured. Please open the Settings > Secrets menu and configure your GEMINI_API_KEY, or run the Paid Model flow to enable image models.",
      code: "MISSING_API_KEY",
    });
    return false;
  }
  return true;
}

// Endpoint 1: Generate Visual Design Blueprint & Copy
app.post("/api/generate-blueprint", async (req, res) => {
  if (!checkApiKey(res)) return;

  try {
    const { name, description, theme, colors } = req.body;

    if (!name || !description) {
      res.status(400).json({ error: "Product name and description are required." });
      return;
    }

    const themeStr = theme || "Minimalist Modern";
    const colorsStr = Array.isArray(colors) && colors.length > 0 ? colors.join(", ") : "Standard aesthetic palette";

    const prompt = `Generate a detailed marketing and design campaign for the following product:
Product Name: ${name}
Product Description: ${description}
Brand Theme/Vibe: ${themeStr}
Color Palette: ${colorsStr}

Your tasks:
1. Create a detailed 'visualBlueprint'. This must describe the exact physical appearance of the product (its industrial design, form, materials, textures, elegant accents, logo placement, and typography) in highly graphic, vivid detail. The blueprint should NOT include any people, hands, faces, or human context. It should focus 100% on the product itself to serve as a high-fidelity reference for an image generator.
2. Create a brand 'tagline' (3-6 words).
3. Create minimal ad copy and setting concepts for three distinct advertising mediums:
   - Billboard: A billboard layout suited for wide billboards (16:9). Minimal copy slogan (max 5 words) and a visual setting 'ideas' description.
   - Newspaper: An elegant editorial print ad (3:4). Clean slogan (max 10 words) and a print-focused visual layout 'ideas' description.
   - Social Post: A contemporary lifestyle placement post (1:1). Engaging text copy (max 25 words) with hashtags and a creative prop setting 'ideas' description.

Ensure absolutely NO people, human figures, or body parts are suggested in the visual ideas or blueprint.`;

    const response = await ai!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite product designer, copywriter, and brand strategist. You deliver crisp, creative, structured JSON outputs. You strictly ensure that no humans, people, or body parts are ever present in product designs or scenes.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualBlueprint: {
              type: Type.STRING,
              description: "Extremely detailed description of the product's physical design, materials, and features, optimized for an image generator."
            },
            tagline: {
              type: Type.STRING,
              description: "A short, premium brand tagline (3-6 words)."
            },
            billboard: {
              type: Type.OBJECT,
              properties: {
                copy: { type: Type.STRING, description: "Billboard ad copy slogan (max 5 words)." },
                ideas: { type: Type.STRING, description: "Detailed description of the product in an outdoor highway/city billboard setting." }
              },
              required: ["copy", "ideas"]
            },
            newspaper: {
              type: Type.OBJECT,
              properties: {
                copy: { type: Type.STRING, description: "Newspaper/print ad copy slogan (max 10 words)." },
                ideas: { type: Type.STRING, description: "Detailed description of the product in an editorial full-page print layout." }
              },
              required: ["copy", "ideas"]
            },
            socialPost: {
              type: Type.OBJECT,
              properties: {
                copy: { type: Type.STRING, description: "Social media caption with modern style and hashtags (max 25 words)." },
                ideas: { type: Type.STRING, description: "Detailed lifestyle tabletop/studio prop setup for the product." }
              },
              required: ["copy", "ideas"]
            }
          },
          required: ["visualBlueprint", "tagline", "billboard", "newspaper", "socialPost"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Blueprint generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate visual style guide.",
      details: error.toString()
    });
  }
});

// Endpoint 2: Generate Individual Consistent Shot using gemini-2.5-flash-image (Nano-Banana)
app.post("/api/generate-image", async (req, res) => {
  if (!checkApiKey(res)) return;

  try {
    const { name, visualBlueprint, medium, ideas, theme } = req.body;

    if (!name || !visualBlueprint || !medium || !ideas) {
      res.status(400).json({ error: "Missing required fields: name, visualBlueprint, medium, and ideas." });
      return;
    }

    let aspectRatio: "1:1" | "16:9" | "3:4" = "1:1";
    let imagePrompt = "";

    // Design the prompt according to the selected medium, adding strict constraints to prevent people
    if (medium === "billboard") {
      aspectRatio = "16:9";
      imagePrompt = `A high-end modern outdoor advertising billboard mockup, beautifully installed on a clean, architectural steel frame alongside a highway or in a chic urban plaza during golden hour or twilight. The billboard display prominently shows the product: ${name}.
Product Appearance: ${visualBlueprint}
Billboard Content Details: The product is displayed in an eye-catching, spacious advertisement as described: ${ideas}.
Visual Style: Professional, cinematic commercial photography, ultra-sharp focus, modern ${theme || "minimalist"} aesthetic, beautiful skies, clean presentation.
CRITICAL CONSTRAINT: Absolutely NO people, NO faces, NO hands, and NO human figures should be visible anywhere in the image. The environment is clean and peaceful. Focus strictly on the product billboard.`;
    } else if (medium === "newspaper") {
      aspectRatio = "3:4";
      imagePrompt = `A premium black-and-white or subtly toned high-contrast full-page printed newspaper advertisement, or a clean editorial magazine layout page, laying flat on a studio surface. The ad prominently displays the product: ${name}.
Product Appearance: ${visualBlueprint}
Layout Details: The print ad displays the product elegant and centered with minimalist text columns or framing borders as described: ${ideas}.
Visual Style: High-quality print texture, soft paper shadows, professional studio product shot, exquisite details, sharp contrasts, high-fidelity publication grade.
CRITICAL CONSTRAINT: Absolutely NO people, NO hands, NO faces, and NO human figures. Keep the advertisement and surrounding space completely devoid of humans.`;
    } else {
      // socialPost
      aspectRatio = "1:1";
      imagePrompt = `A stylish, high-quality social media lifestyle product photography shot (e.g., for Instagram/Pinterest). The product: ${name} is artfully arranged on a clean, textured surface.
Product Appearance: ${visualBlueprint}
Setting Details: The tabletop setup utilizes elegant organic props, natural geometric shadows, or delicate textures as described: ${ideas}.
Visual Style: Soft and warm natural lighting, modern editorial styling, extremely shallow depth of field, sharp focus on the product, beautiful soft bokeh in the background.
CRITICAL CONSTRAINT: Absolutely NO people, NO human models, NO hands, and NO faces are present. The layout is a pure product lifestyle arrangement.`;
    }

    console.log(`Generating ${medium} (${aspectRatio}) with Nano-Banana...`);

    const imageResponse = await ai!.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: imagePrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    let base64Image = "";
    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      // Fallback message if image model failed to return binary data
      throw new Error("No image data returned from Nano-Banana model. Verify API key privileges.");
    }

    const imageUrl = `data:image/png;base64,${base64Image}`;
    res.json({
      imageUrl,
      prompt: imagePrompt,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate brand visualization.",
      details: error.toString(),
      code: error.code || "IMAGE_GEN_FAILED",
    });
  }
});

// Serve frontend through Vite in dev, or static build in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
