const pokeballBtn = document.getElementById('open-pokeball');
const pokemonResult = document.getElementById('pokemon-result');
const pokedexList = document.getElementById('pokedex-list');
const pokedexCount = document.getElementById('pokedex-count');
const languageToggle = document.getElementById('language-toggle');
const languageLabel = document.getElementById('language-label'); // ✅ Ajout de la gestion du texte du switch
const sortSelect = document.getElementById('sort-select');

const lastOpenKey = 'lastOpenTimestamp';
const pokedexKey = 'myPokedex';

// 🎨 Définition des icônes des types
const typeIcons = {
  normal: "images/type/normal.png",
  fire: "images/type/fire.png",
  water: "images/type/water.png",
  electric: "images/type/electric.png",
  grass: "images/type/grass.png",
  ice: "images/type/ice.png",
  fighting: "images/type/fighting.png",
  poison: "images/type/poison.png",
  ground: "images/type/ground.png",
  flying: "images/type/flying.png",
  psychic: "images/type/psychic.png",
  bug: "images/type/bug.png",
  rock: "images/type/rock.png",
  ghost: "images/type/ghost.png",
  dragon: "images/type/dragon.png",
  dark: "images/type/dark.png",
  steel: "images/type/steel.png",
  fairy: "images/type/fairy.png"
};

// 🟢 Fonction pour afficher les icônes des types
function getTypeIcons(types) {
    return types.split(", ").map(type =>
        `<img src="${typeIcons[type]}" alt="${type}" class="type-icon">`
    ).join(" ");
}

// 🟢 Fonction pour récupérer les détails d'un Pokémon avec la langue sélectionnée
async function fetchPokemonById(pokemonId) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (!res.ok) throw new Error('Erreur API Pokémon');
    const pokemon = await res.json();
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    // ✅ Assurer que la langue sélectionnée est bien prise en compte
    const selectedLanguage = localStorage.getItem('selectedLanguage') === "en" ? "en" : "fr";
    const pokemonName = speciesData.names.find(n => n.language.name === selectedLanguage)?.name || speciesData.name;

    return {
        id: pokemon.id,
        name: pokemonName,
        img: pokemon.sprites.front_default,
        rarity: speciesData.is_legendary || speciesData.is_mythical ? "legendary" :
                speciesData.capture_rate <= 45 ? "rare" : "common",
        type: pokemon.types.map(t => t.type.name).join(", "),
        description: speciesData.flavor_text_entries.find(f => f.language.name === selectedLanguage)?.flavor_text || "Pas de description."
    };
}

// 🟢 Fonction pour afficher la popup d'un Pokémon
function displayPokemonPopup(pokemon) {
    document.getElementById("popup-pokemon-name").textContent = pokemon.name;
    document.getElementById("popup-pokemon-img").src = pokemon.img;

    document.getElementById("popup-pokemon-type").innerHTML = `
        <div class="type-container">
            <span class="type-label">Type :</span>
            <div class="type-icon-container">
                ${getTypeIcons(pokemon.type)}
            </div>
        </div>
    `;

    document.getElementById("popup-pokemon-description").textContent = pokemon.description;
    document.getElementById("pokemon-popup").style.display = "block";

    // ✅ Réactiver le bouton de fermeture
    document.querySelector(".close-btn").onclick = () => {
        document.getElementById("pokemon-popup").style.display = "none";
    };
}

async function displayPokedex() {
    chrome.storage.local.get([pokedexKey], async (result) => {
        let pokedex = result[pokedexKey] || [];
        const selectedLanguage = localStorage.getItem('selectedLanguage') === "en" ? "en" : "fr";

        for (let i = 0; i < pokedex.length; i++) {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedex[i].id}/`);
            const speciesData = await speciesRes.json();
            pokedex[i].name = speciesData.names.find(n => n.language.name === selectedLanguage)?.name || speciesData.name;
        }

        const sortOption = sortSelect?.value || "capture"; // ✅ Par défaut, tri par capture
        if (sortOption === "pokedex") {
            pokedex.sort((a, b) => a.id - b.id);
        } else {
            pokedex.sort((a, b) => a.capturedAt - b.capturedAt);
        }

        pokedexList.innerHTML = pokedex.map(p => `
            <li class="pokemon-container ${p.rarity}" data-id="${p.id}">
                <img src="${p.img}" alt="${p.name}" class="pokedex-img">
                <span class="pokemon-name">${p.name}</span>
            </li>`).join('');

        document.querySelectorAll(".pokemon-container").forEach(pokemonElement => {
            pokemonElement.addEventListener("click", async (event) => {
                const pokemonId = event.currentTarget.dataset.id;
                const pokemonData = await fetchPokemonById(pokemonId);
                displayPokemonPopup(pokemonData);
            });
        });

        pokedexCount.textContent = `${pokedex.length} Pokémon capturés`;
    });
}

// 🟢 Ajout de l'écouteur d'événements pour gérer le tri
sortSelect?.addEventListener('change', displayPokedex);

pokeballBtn?.addEventListener('click', async () => {
    const now = Date.now();
    const result = await chrome.storage.local.get([lastOpenKey]);
    const lastOpen = result[lastOpenKey] || 0;

    if (now - lastOpen >= 1000) { // cooldown 1 seconde
        try {
            const pokemonId = Math.floor(Math.random() * 1025) + 1;

            // ✅ Gestion de la rareté avec les bonnes probabilités
            const rarityRoll = Math.random() * 100;
            let rarity;
            if (rarityRoll < 89) {
                rarity = "common";
            } else if (rarityRoll < 99) {
                rarity = "rare";
            } else {
                rarity = "legendary";
            }

            const pokemon = await fetchPokemonById(pokemonId);
            pokemon.rarity = rarity;

            // ✅ Affichage immédiat du Pokémon capturé
            pokemonResult.innerHTML = `
                <div class="pokemon-result-container ${pokemon.rarity}">
                    <img src="${pokemon.img}">
                </div>
                <h4>${pokemon.name}</h4>
            `;

            chrome.storage.local.get([pokedexKey], (result) => {
                let pokedex = result[pokedexKey] || [];
                if (!pokedex.some(p => p.id === pokemon.id)) {
                    pokedex.push({
                        id: pokemon.id,
                        name: pokemon.name,
                        img: pokemon.img,
                        rarity: pokemon.rarity,
                        capturedAt: Date.now()
                    });
                    chrome.storage.local.set({ [pokedexKey]: pokedex }, displayPokedex);
                }
            });

            chrome.storage.local.set({ [lastOpenKey]: now });
        } catch (error) {
            pokemonResult.innerHTML = `<p>Erreur de chargement : ${error.message}</p>`;
        }
    }
});

// 🟢 Gestion du changement de langue et mise à jour du label du switch
languageToggle?.addEventListener('change', () => {
    const newLanguage = languageToggle.checked ? 'en' : 'fr';
    localStorage.setItem('selectedLanguage', newLanguage);
    languageLabel.textContent = newLanguage === "en" ? "English" : "Français"; // ✅ Mise à jour du texte du switch
    displayPokedex();
});

// 🟢 Charger la langue et mettre à jour le Pokédex
document.addEventListener('DOMContentLoaded', () => {
    languageLabel.textContent = localStorage.getItem('selectedLanguage') === "en" ? "English" : "Français";
    displayPokedex();
});
