
# 📦 Extension Chrome Pokédex avec IA

Une extension Chrome interactive pour capturer des Pokémon, les afficher dans un Pokédex personnalisé, et découvrir une **anecdote générée par une IA locale** (grâce à [Ollama](https://ollama.com)) pour chaque Pokémon.

## ⚙️ Fonctionnalités

- Capture aléatoire de Pokémon avec chance de shiny (2%).
- Pokédex local avec tri, recherche et affichage des Pokémon capturés.
- Indicateur de rareté (commun, rare, légendaire).
- Affichage des types de Pokémon avec icônes stylisées.
- Anecdote générée par une **IA locale Ollama**.

---

## 🧩 Installation et mise en place

### 1. Cloner ou télécharger le dépôt

```bash
git clone https://github.com/Gregoire-Mouilleau/extension_pokedex.git
cd extension_pokedex
```

### 2. Installer les dépendances serveur

```bash
npm install
```

### 3. Installer et configurer Ollama

#### a. Télécharger et installer Ollama

- 📥 [Télécharger Ollama](https://ollama.com/download)

#### b. Démarrer Ollama

```bash
ollama run mistral
```

**Important** : Ce téléchargement du modèle peut prendre plusieurs minutes.

---

## 🚀 Lancer le serveur API

Dans le dossier de l’extension :

```bash
npm start
```

Cela démarre le serveur Express qui appelle Ollama en local via la route :

```
POST http://localhost:3001/anecdote
```

---

## 🧪 Tester l’extension Chrome

1. Ouvrir Chrome et aller sur `chrome://extensions/`
2. Activer le **mode développeur**
3. Cliquer sur **Charger l’extension non empaquetée**
4. Sélectionner le dossier `extension_pokedex` (là où se trouve `manifest.json`)
5. L’icône de Pokéball apparaîtra dans la barre d’extensions

---

## ✅ Utilisation

- Cliquez sur la Pokéball pour capturer un Pokémon.
- Si le Pokémon est nouveau ou shiny, il sera marqué "NEW".
- Cliquez sur un Pokémon du Pokédex pour afficher sa fiche détaillée.
- L’anecdote générée apparaît dans la popup, une seule fois par ouverture.

---

## 🧠 Technologies

- HTML/CSS/JS
- API PokéAPI
- Ollama + Mistral (modèle LLM local)
- Node.js + Express
- Chrome Extension Manifest V3

---

## 👨‍💻 Auteur

Grégoire Mouilleau & Nicolas Puig — EPSI
