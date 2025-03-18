const pokeballBtn = document.getElementById('open-pokeball');
const pokemonResult = document.getElementById('pokemon-result');
const pokedexList = document.getElementById('pokedex-list');
const pokedexCount = document.getElementById('pokedex-count');
const languageToggle = document.getElementById('language-toggle');
const languageLabel = document.getElementById('language-label');

const lastOpenKey = 'lastOpenTimestamp';
const pokedexKey = 'myPokedex';
const nameCacheKey = 'pokemonNamesCache';

// Élément de la popup
const popup = document.getElementById("pokemon-popup");
const popupCloseBtn = document.querySelector(".close-btn");
const popupPokemonName = document.getElementById("popup-pokemon-name");
const popupPokemonImg = document.getElementById("popup-pokemon-img");
const popupPokemonType = document.getElementById("popup-pokemon-type");
const popupPokemonDescription = document.getElementById("popup-pokemon-description");

// 🟢 Fonction pour récupérer le nom dans la langue sélectionnée (avec cache)
async function getPokemonName(pokemonId, speciesData) {
    const selectedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
    let nameCache = JSON.parse(localStorage.getItem(nameCacheKey)) || {};

    if (nameCache[pokemonId] && nameCache[pokemonId][selectedLanguage]) {
        return nameCache[pokemonId][selectedLanguage];
    }

    const nameEntry = speciesData.names.find(n => n.language.name === selectedLanguage);
    const name = nameEntry ? nameEntry.name : speciesData.name;

    if (!nameCache[pokemonId]) nameCache[pokemonId] = {};
    nameCache[pokemonId][selectedLanguage] = name;
    localStorage.setItem(nameCacheKey, JSON.stringify(nameCache));

    return name;
}

// 🟢 Optimisation : Chargement rapide des Pokémon capturés
async function fetchPokemonById(pokemonId) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (!res.ok) throw new Error('Erreur API Pokémon');
    const pokemon = await res.json();
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    const pokemonName = await getPokemonName(pokemonId, speciesData);

    return {
        id: pokemon.id,
        name: pokemonName,
        img: pokemon.sprites.front_default,
        rarity: speciesData.is_legendary || speciesData.is_mythical ? "legendary" :
                speciesData.capture_rate <= 45 ? "rare" : "common",
        type: pokemon.types.map(t => t.type.name).join(", "),
        description: speciesData.flavor_text_entries.find(f => f.language.name === localStorage.getItem('selectedLanguage'))?.flavor_text || "Pas de description."
    };
}

// 🟢 Fonction pour afficher la popup d'un Pokémon
function displayPokemonPopup(pokemon) {
    popupPokemonName.textContent = pokemon.name;
    popupPokemonImg.src = pokemon.img;
    popupPokemonType.textContent = "Type : " + pokemon.type;
    popupPokemonDescription.textContent = pokemon.description;

    popup.style.display = "block";
}

// Fermer la popup
popupCloseBtn.addEventListener("click", () => {
    popup.style.display = "none";
});

// 🟢 Chargement rapide du Pokédex
async function displayPokedex() {
    chrome.storage.local.get([pokedexKey], async (result) => {
        let pokedex = result[pokedexKey] || [];

        for (let i = 0; i < pokedex.length; i++) {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedex[i].id}/`);
            const speciesData = await speciesRes.json();
            pokedex[i].name = await getPokemonName(pokedex[i].id, speciesData);
        }

        pokedexList.innerHTML = pokedex.map(p => `
            <li class="pokemon-container ${p.rarity}" data-id="${p.id}">
                <img src="${p.img}" alt="${p.name}" class="pokedex-img">
                <span class="pokemon-name">${p.name}</span>
            </li>`).join('');

        document.querySelectorAll(".pokemon-container").forEach(pokemonElement => {
            pokemonElement.addEventListener("click", async () => {
                const pokemonId = pokemonElement.getAttribute("data-id");
                const pokemonData = await fetchPokemonById(pokemonId);
                displayPokemonPopup(pokemonData);
            });
        });

        // Mettre à jour le nombre de Pokémon capturés
        fetch('https://pokeapi.co/api/v2/pokemon-species/?limit=1')
            .then(res => res.json())
            .then(data => {
                const totalPokemon = data.count;
                pokedexCount.textContent = `${pokedex.length} / ${totalPokemon} Pokémon capturés`;
            });
    });
}

// 🟢 Capture d'un Pokémon avec optimisation
pokeballBtn.addEventListener('click', async () => {
    const now = Date.now();
    const result = await chrome.storage.local.get([lastOpenKey]);
    const lastOpen = result[lastOpenKey] || 0;

    if (now - lastOpen >= 1000) { // cooldown 1 seconde pour tests rapides
        try {
            const pokemonId = Math.floor(Math.random() * 1025) + 1;
            const pokemon = await fetchPokemonById(pokemonId);

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
    } else {
        const remainingSeconds = Math.ceil((1000 - (now - lastOpen)) / 1000);
        pokemonResult.innerHTML = `<p>⏳ Attends ${remainingSeconds} secondes !</p>`;
    }
});

// 🟢 Gestion du changement de langue via le switch
function updateLanguageLabel() {
    const selectedLanguage = languageToggle.checked ? 'en' : 'fr';
    languageLabel.textContent = selectedLanguage === 'en' ? "English" : "Français";
    localStorage.setItem('selectedLanguage', selectedLanguage);
    displayPokedex();
}

// 🟢 Événements pour changer la langue et le tri
languageToggle.addEventListener('change', updateLanguageLabel);
document.getElementById('filter-pokedex').addEventListener('change', displayPokedex);

// 🟢 Charger la langue sélectionnée et mettre à jour le Pokédex
document.addEventListener('DOMContentLoaded', () => {
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
    languageToggle.checked = savedLanguage === 'en';
    languageLabel.textContent = savedLanguage === 'en' ? "English" : "Français";

    displayPokedex();
});
