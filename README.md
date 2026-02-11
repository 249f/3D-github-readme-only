# 🧊 3D GitHub Contributions

<div align="center">

### Display a stunning 3D isometric contribution graph on your GitHub profile.

**No GitHub Actions • No Tokens • No Setup**  
Just paste one line into your profile `README.md`.

[🚀 **Live Demo**](https://3d-github-readme-only.vercel.app/?user=torvalds) · [📖 How It Works](#how-it-works) · [⚡ Deploy Your Own](#deploy-your-own)

</div>

---

## 🎯 How to use on your Profile

You don't need to fork this repo or deploy anything. To show your own 3D graph, just copy and paste this line into your GitHub profile `README.md`:

```markdown
![3D Contrib](https://3-d-github-readme-only.vercel.app/api/generate?user=YOUR_GITHUB_USERNAME)
```

> [!IMPORTANT]
> **Replace `YOUR_GITHUB_USERNAME`** with your actual GitHub username.

### Example:
`![3D Contrib](https://3-d-github-readme-only.vercel.app/api/generate?user=torvalds)`

---

## ✨ Features

- 🔓 **Zero Setup**: No tokens, no actions, no YAML files in your repo.
- 🧊 **Real 3D**: Isometric projection with proper depth & lighting.
- 🌐 **Public Service**: Works for any public profile using our hosted backend.
- ⚡ **Fast**: Pure SVG generation, loads instantly in your README.
- 🔄 **Auto-Updates**: Graph refreshes automatically every hour.
- 📐 **Scalable**: SVG looks sharp at any zoom level.

---

## 🔧 How It Works

This project provides a **Serverless API** that fetches your contribution data directly from GitHub and renders it into a 3D isometric SVG on the fly. 

1. **You** add the image URL to your README.
2. **GitHub** requests the image from our Vercel backend.
3. **Our Service** fetches your raw data, calculates 3D coordinates, and returns a pure SVG.
4. **Your Profile** looks amazing.

## 🌐 Interactive Web App

Visit [**3-d-github-readme-only.vercel.app**](https://3-d-github-readme-only.vercel.app) to:
- Rotate your graph in 3D using your mouse.
- Hover over blocks to see exact daily counts.
- Download your graph as a high-quality PNG.

## 📁 Repository Contents

This repo contains the source code for the public service:
- `api/generate.js`: The 3D SVG engine.
- `api/data.js`: Reliable data fetcher (bypasses CORS).
- `index.html`: The interactive front-end.

## 📄 License

MIT — feel free to use the service however you like!

---

<div align="center">

**Built with ❤️ for the GitHub community**

If you found this useful, drop a ⭐ on the repo!

</div>
