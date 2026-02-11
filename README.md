# 🧊 3D GitHub Contributions

<div align="center">

### Display a stunning 3D isometric contribution graph on your profile.

**No GitHub Actions • No Tokens • No Setup**  
Just paste one line into your `README.md`.

[🚀 **Live Demo**](https://3-d-github-readme-only.vercel.app/?user=249f) · [📖 How It Works](#how-it-works) · [⚡ Deploy Your Own](#deploy-your-own)

</div>

---

## 🎯 Direct Usage (One-Line Setup)

You don't need to visit a website or install anything. To show your own 3D graph, just add this line to your GitHub profile `README.md`:

```markdown
![3D Contrib](https://your-vercel-project.vercel.app/api/generate?user=YOUR_GITHUB_USERNAME)
```

> [!TIP]
> **Replace `your-vercel-project`** with your actual Vercel domain and **`YOUR_GITHUB_USERNAME`** with your own username.

### Example:
`![3D Contrib](https://3d-github-readme-only.vercel.app/api/generate?user=torvalds)`

---

## ✨ Features

- 🔓 **Zero Setup**: No tokens, no actions, no YAML config files.
- 🧊 **Real 3D**: Isometric projection with proper depth & lighting.
- 🌐 **Any User**: Works for any public GitHub profile.
- ⚡ **Fast**: Pure SVG generation, no headless browser needed.
- 🔄 **Auto-Updates**: Graph refreshes automatically (1-hour cache).
- 📐 **Scalable**: SVG looks sharp at any size.

---

## ⚡ Setup Your Own Service (Recommended)

To ensure your README always loads quickly, it's best to deploy your own instance of this tool (it's free!):

1. **Deploy to Vercel** (one click):
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2F3D-github-readme-only)
2. Once deployed, use **your new URL** in the Markdown snippet above.

---

## 🔧 How It Works

This project is a **Serverless Function** that fetches your contribution data directly from GitHub and renders it into a 3D isometric SVG on the fly. 

- **Vercel Edge**: Runs the generation logic instantly.
- **Pure SVG**: Each "day" is drawn as a set of 3D paths with z-ordering.
- **No Dependencies**: No Puppeteer, no Canvas, just lightweight math.

## 🌐 Interactive App

If you visit your project URL in a browser, you can:
- Rotate the graph with your mouse.
- Hover over blocks to see exact counts.
- Download the graph as a PNG.

## 📁 Project Structure

```
├── api/
│   ├── generate.js     # Serverless SVG generator
│   └── data.js         # Serverless data fetcher
├── index.html          # Interactive web app
├── vercel.json         # Vercel routing config
└── package.json        # Project metadata
```

## 📄 License

MIT — feel free to use it for anything!

---

<div align="center">

**Built with ❤️ for the GitHub community**

If you found this useful, drop a ⭐ on the repo!

</div>
